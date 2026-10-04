import { z } from "zod";
import { getRuntime, json, errorResponse, clientIp, limited } from "@/server/runtime";
import { store } from "@/server/store";
import { signToken } from "@/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Exchange a one-time code (sent by the bot to a chat that is already linked to a wallet) for a 12h session.
 * POST only: link-preview crawlers fetch URLs with GET and must not be able to burn the code.
 * The session proves "this person controls the linked Telegram chat". Money actions still need a wallet signature.
 */
export async function POST(req: Request) {
  try {
    const secret = getRuntime().cfg.SESSION_SECRET;
    if (!secret) return json({ error: "sign-in is not configured" }, 503);
    if (await limited(`tglogin:${clientIp(req)}`, 20, 3600)) return json({ error: "slow down" }, 429);
    const { code } = z.object({ code: z.string().regex(/^[0-9a-f]{32}$/) }).parse(await req.json());
    const address = await store.consumeLoginCode(code);
    if (!address) return json({ error: "Tautan sudah dipakai atau kedaluwarsa. Ketik /masuk di Telegram untuk tautan baru." }, 401);
    return json({ token: signToken(address, secret, Date.now(), "telegram"), address });
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: "bad request" }, 400);
    return errorResponse(e);
  }
}
