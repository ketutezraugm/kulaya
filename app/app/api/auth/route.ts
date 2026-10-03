import { z } from "zod";
import { json, errorResponse, clientIp, limited, getRuntime } from "@/server/runtime";
import { completeChallenge, newChallenge } from "@/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const Body = z.discriminatedUnion("step", [
  z.object({ step: z.literal("challenge"), address: addr }),
  z.object({ step: z.literal("verify"), address: addr, nonce: z.string().regex(/^[0-9a-f]{32}$/), signature: z.string().regex(/^0x[0-9a-fA-F]+$/).max(400) }),
]);

/** Wallet sign-in: step "challenge" returns a message to sign; step "verify" exchanges the signature for a 12h token. */
export async function POST(req: Request) {
  try {
    const secret = getRuntime().cfg.SESSION_SECRET;
    if (!secret) return json({ error: "sign-in is not configured" }, 503);
    if (await limited(`auth:${clientIp(req)}`, 40, 3600)) return json({ error: "slow down" }, 429);
    const b = Body.parse(await req.json());
    if (b.step === "challenge") return json(await newChallenge(b.address));
    const token = await completeChallenge(b.address, b.nonce, b.signature, secret);
    return token ? json({ token }) : json({ error: "invalid or expired signature" }, 401);
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 200) }, 400);
    return errorResponse(e);
  }
}
