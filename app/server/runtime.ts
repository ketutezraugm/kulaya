import { loadConfig } from "./config";
import { makeChain } from "./chain";
import { makeLLM } from "./llm";
import { makeRelayer } from "./relay";
import { limited } from "./kv";
import { verifyToken } from "./session";

/** Built once per serverless instance and reused while it stays warm. */
let rt: ReturnType<typeof build> | null = null;

function build() {
  const cfg = loadConfig();
  const chain = makeChain(cfg);
  return { cfg, chain, llm: makeLLM(cfg, cfg.LLM_CHAIN), relayer: makeRelayer(chain) };
}
export const getRuntime = () => (rt ??= build());

/** Client IP as set by the platform edge (Vercel overwrites x-forwarded-for, so the first entry is not client-spoofable). */
export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)), { status, headers: { "content-type": "application/json", ...headers } });
}

/** Map upstream AI quota/overload errors to a friendly 503 instead of leaking provider text. */
export function errorResponse(e: unknown): Response {
  const status = (e as { status?: number })?.status;
  const m = String((e as Error)?.message ?? e);
  if (status === 429 || status === 503 || /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(m)) return json({ error: "AI model is busy right now, please retry in a moment" }, 503);
  if (/^busy:/.test(m)) return json({ error: "service is busy, please retry in a moment" }, 503);
  console.error("api error:", m.split("\n")[0]);
  return json({ error: m.split("\n")[0].slice(0, 200) }, 500);
}

export { limited };

/** Wallet address behind a valid "Authorization: Bearer <session token>" header, or null. */
export function authAddress(req: Request): string | null {
  const secret = getRuntime().cfg.SESSION_SECRET;
  return secret ? verifyToken(req.headers.get("authorization")?.replace(/^Bearer /i, ""), secret) : null;
}
