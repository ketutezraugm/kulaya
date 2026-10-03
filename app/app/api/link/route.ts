import { verifyMessage, type Address } from "viem";
import { z } from "zod";
import { json, errorResponse, clientIp, limited } from "@/server/runtime";
import { store } from "@/server/store";
import { notifyLinked } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({ code: z.string().regex(/^[0-9a-f]{12}$/), address: z.string().regex(/^0x[0-9a-fA-F]{40}$/), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });
const linkMessage = (code: string) => `Link Kulaya Telegram: ${code}`;

export async function POST(req: Request) {
  try {
    if (await limited(`link:${clientIp(req)}`, 30, 3600)) return json({ error: "slow down" }, 429);
    const b = Body.parse(await req.json());
    // the wallet must sign the one-time code, so only its owner can bind it to a Telegram chat
    const ok = await verifyMessage({ address: b.address as Address, message: linkMessage(b.code), signature: b.signature as `0x${string}` });
    if (!ok) return json({ error: "bad signature" }, 401);
    const tgId = await store.completeLink(b.code, b.address);
    if (!tgId) return json({ error: "code expired or unknown" }, 410);
    await notifyLinked(tgId, b.address);
    return json({ linked: true });
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 200) }, 400);
    return errorResponse(e);
  }
}
