import { z } from "zod";
import { json, errorResponse, clientIp, limited, authAddress } from "@/server/runtime";
import { cleanText, getProfile, saveProfile } from "@/server/profile";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const addr = /^0x[0-9a-fA-F]{40}$/;

/** GET ?merchant=0x… → the shop's public name. With the owner's own session token it also returns their private nickname. */
export async function GET(req: Request) {
  try {
    const m = new URL(req.url).searchParams.get("merchant") ?? "";
    if (!addr.test(m)) return json({ error: "bad merchant" }, 400);
    const p = await getProfile(m);
    const mine = authAddress(req)?.toLowerCase() === m.toLowerCase();
    return json({ name: p?.name ?? null, ...(mine ? { nickname: p?.nickname ?? null } : {}) }, 200, { "cache-control": mine ? "no-store" : "public, s-maxage=5, stale-while-revalidate=30" });
  } catch (e) { return errorResponse(e); }
}

/** POST {name, nickname?} → saves the signed-in owner's profile. The address always comes from the session, never the body. */
export async function POST(req: Request) {
  try {
    const me = authAddress(req);
    if (!me) return json({ error: "please sign in again" }, 401);
    if (await limited(`profile:${me}`, 20, 3600)) return json({ error: "rate limit: try again later" }, 429);
    const b = z.object({ name: z.unknown(), nickname: z.unknown().optional() }).parse(await req.json());
    const name = cleanText(b.name, 2, 40);
    const nickname = b.nickname === undefined || b.nickname === "" ? "" : cleanText(b.nickname, 1, 20);
    if (!name) return json({ error: "Nama toko 2–40 huruf/angka, tanpa tautan atau simbol aneh." }, 400);
    if (nickname === null) return json({ error: "Panggilan 1–20 huruf, tanpa tautan atau simbol aneh." }, 400);
    const p = await saveProfile(me, name, nickname);
    return json({ name: p.name, nickname: p.nickname });
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: "bad request" }, 400);
    return errorResponse(e);
  }
}
