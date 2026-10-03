import { z } from "zod";
import type { Address } from "viem";
import { getRuntime, json, errorResponse, clientIp, limited } from "@/server/runtime";
import { runAgent } from "@/server/agent";
import { verifyToken } from "@/server/session";
import { kv } from "@/server/kv";
import type { Msg } from "@/server/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ message: z.string().min(1).max(1000) });

/** The shop owner's web chat: same agent as Telegram. The merchant comes from the signed session, never from the request body. */
export async function POST(req: Request) {
  try {
    const { chain, cfg, llm } = getRuntime();
    if (!cfg.SESSION_SECRET) return json({ error: "chat is not configured" }, 503);
    const address = verifyToken(req.headers.get("authorization")?.replace(/^Bearer /i, ""), cfg.SESSION_SECRET);
    if (!address) return json({ error: "please sign in again" }, 401);
    // the model path burns free-tier LLM quota: cap per wallet and per IP
    if ((await limited(`chat:addr:${address}`, 40, 3600)) || (await limited(`chat:ip:${clientIp(req)}`, 80, 3600))) return json({ error: "rate limit: try again later" }, 429);
    const b = Body.parse(await req.json());
    const hist = (await kv.get<Msg[]>(`webhist:${address}`)) ?? [];
    const r = await runAgent(llm, { chain, merchant: address as Address, sandbox: false }, hist, { text: b.message });
    await kv.set(`webhist:${address}`, r.history, 24 * 3600);
    return json({ reply: r.text, paymentLinks: r.paymentLinks, loan: r.loan ?? null });
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 200) }, 400);
    return errorResponse(e);
  }
}
