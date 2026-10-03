import { z } from "zod";
import type { Address } from "viem";
import { getRuntime, json, errorResponse, clientIp, limited } from "@/server/runtime";
import { runAgent, runTool } from "@/server/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  attack: z.string().max(600).optional(), // what a (compromised) user says to the agent
  memo: z.string().max(140).optional(), // pretend a customer wrote this payment memo
  // "model is fully compromised": skip the model and hand a raw tool call straight to the safety layers
  rawToolCall: z.object({ principal_rupiah: z.number(), fee_percent: z.number(), repay_percent: z.number(), risk: z.string(), rationale_template: z.string().max(800) }).optional(),
  offchainChecks: z.boolean().default(true), // false = disable the policy layer, the contract alone must still block
});

export async function POST(req: Request) {
  try {
    const { chain, cfg, llm } = getRuntime();
    const b = Body.parse(await req.json());
    const merchant = cfg.REDTEAM_MERCHANT as Address | undefined;
    if (!merchant) return json({ error: "redteam merchant not configured" }, 503);
    // the model path burns free-tier Gemini quota; the raw path only costs RPC reads
    const ip = clientIp(req);
    if (await limited(b.rawToolCall ? `redteam:raw:${ip}` : `redteam:model:${ip}`, b.rawToolCall ? cfg.REDTEAM_RATE_LIMIT * 3 : cfg.REDTEAM_RATE_LIMIT, 3600)) return json({ error: "rate limit: try again later" }, 429);
    const ctx = { chain, merchant, sandbox: true, injectedMemo: b.memo, skipPolicy: !b.offchainChecks };
    if (b.rawToolCall) {
      const { result } = await runTool(ctx, "propose_loan", b.rawToolCall);
      return json({ mode: "compromised-model", trace: [{ tool: "propose_loan", args: b.rawToolCall, result }], reply: null });
    }
    if (!b.attack) return json({ error: "attack text required" }, 400);
    const r = await runAgent(llm, ctx, [], { text: b.attack });
    return json({ mode: "model", trace: r.trace, reply: r.text });
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 200) }, 400);
    return errorResponse(e);
  }
}
