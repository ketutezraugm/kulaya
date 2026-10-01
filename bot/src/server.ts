import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { verifyMessage, type Address } from "viem";
import { z } from "zod";
import type { Chain } from "./chain.js";
import type { Relayer } from "./relay.js";
import { getParams, agentReputation, getSales } from "./chain.js";
import { runAgent, runTool, type Model } from "./agent.js";
import { store } from "./store.js";

export const linkMessage = (code: string) => `Link Warung Agent Telegram: ${code}`;

const hits = new Map<string, number[]>();
/** ponytail: in-memory sliding window per IP. Behind a proxy, trust x-forwarded-for; use Redis if this runs on >1 instance. */
function limited(ip: string, max: number) {
  const now = Date.now();
  const w = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (w.length >= max) { hits.set(ip, w); return true; }
  w.push(now); hits.set(ip, w);
  return false;
}

const LinkBody = z.object({ code: z.string().regex(/^[0-9a-f]{12}$/), address: z.string().regex(/^0x[0-9a-fA-F]{40}$/), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });
const RedteamBody = z.object({
  attack: z.string().max(600).optional(), // what a (compromised) user says to the agent
  memo: z.string().max(140).optional(), // pretend a customer wrote this payment memo
  rawToolCall: z.object({ principal_rupiah: z.number(), fee_percent: z.number(), repay_percent: z.number(), risk: z.string(), rationale_template: z.string().max(800) }).optional(), // "model is fully compromised": skip the model
  offchainChecks: z.boolean().default(true), // false = disable the policy layer, contract alone must still block
});

function send(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS" });
  res.end(JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req) { size += (c as Buffer).length; if (size > 20_000) throw new Error("body too large"); chunks.push(c as Buffer); }
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

export function startServer(chain: Chain, model: Model, relayer: Relayer, onLinked: (tgId: string, address: string) => void) {
  const { cfg } = chain;
  const server = createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") return send(res, 204, {});
      const url = new URL(req.url ?? "/", "http://x");
      const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "?").split(",")[0].trim();

      if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });

      if (req.method === "GET" && url.pathname === "/agent") {
        const [params, rep, poolAssets, loanedOut, reserve] = await Promise.all([getParams(chain), agentReputation(chain), chain.read("totalAssets"), chain.read("loanedOut"), chain.read("reserve")]);
        return send(res, 200, { agentId: cfg.AGENT_ID, agentAddress: chain.agent.address, warung: chain.warung, reputation: rep, pool: { assets: poolAssets, loanedOut, reserve }, caps: params });
      }

      if (req.method === "GET" && url.pathname === "/sales") {
        const m = url.searchParams.get("merchant") ?? "";
        if (!/^0x[0-9a-fA-F]{40}$/.test(m)) return send(res, 400, { error: "bad merchant" });
        const sales = await getSales(chain, m as Address);
        return send(res, 200, { sales: sales.slice(-10).reverse() });
      }

      if (req.method === "GET" && url.pathname === "/relay") return send(res, 200, { enabled: relayer.enabled, relayer: relayer.address });

      if (req.method === "POST" && url.pathname === "/relay") {
        const r = await relayer.handle(await readJson(req), ip);
        return send(res, r.status, r.body);
      }

      if (req.method === "POST" && url.pathname === "/link") {
        if (limited(ip + ":link", 30)) return send(res, 429, { error: "slow down" });
        const b = LinkBody.parse(await readJson(req));
        const ok = await verifyMessage({ address: b.address as Address, message: linkMessage(b.code), signature: b.signature as `0x${string}` });
        if (!ok) return send(res, 401, { error: "bad signature" });
        const tgId = store.completeLink(b.code, b.address);
        if (!tgId) return send(res, 410, { error: "code expired or unknown" });
        onLinked(tgId, b.address);
        return send(res, 200, { linked: true });
      }

      if (req.method === "POST" && url.pathname === "/redteam") {
        const b = RedteamBody.parse(await readJson(req));
        const merchant = cfg.REDTEAM_MERCHANT as Address | undefined;
        if (!merchant) return send(res, 503, { error: "redteam merchant not configured" });
        // the model path burns free-tier Gemini quota; the raw path only costs RPC reads
        if (limited(ip + (b.rawToolCall ? ":raw" : ":model"), b.rawToolCall ? cfg.REDTEAM_RATE_LIMIT * 3 : cfg.REDTEAM_RATE_LIMIT)) return send(res, 429, { error: "rate limit: try again later" });
        const ctx = { chain, merchant, sandbox: true, injectedMemo: b.memo, skipPolicy: !b.offchainChecks };
        if (b.rawToolCall) {
          const { result } = await runTool(ctx, "propose_loan", b.rawToolCall);
          return send(res, 200, { mode: "compromised-model", trace: [{ tool: "propose_loan", args: b.rawToolCall, result }], reply: null });
        }
        if (!b.attack) return send(res, 400, { error: "attack text required" });
        const r = await runAgent(model, ctx, [], [{ text: b.attack }]);
        return send(res, 200, { mode: "model", trace: r.trace, reply: r.text });
      }

      send(res, 404, { error: "not found" });
    } catch (e) {
      const m = String((e as Error)?.message ?? e);
      if ((e as any)?.status === 429 || (e as any)?.status === 503 || /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(m)) return send(res, 503, { error: "AI model is busy right now, please retry in a moment" });
      const msg = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : (e as Error).message.split("\n")[0];
      send(res, e instanceof z.ZodError ? 400 : 500, { error: msg.slice(0, 200) });
    }
  });
  server.listen(cfg.PORT, () => console.log(`api listening on :${cfg.PORT}`));
  return server;
}
