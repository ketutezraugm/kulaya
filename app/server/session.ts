import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyMessage } from "viem";
import { kv } from "./kv";

/**
 * Sign-in with a wallet (no passwords, no custody): the server issues a one-time nonce, the user signs a fixed message
 * containing it, and the server returns a short-lived HMAC-signed token bound to that address. The token only proves
 * "this browser controls address X"; it can never move funds (the AI key and contracts enforce everything else).
 */
const TTL_SEC = 12 * 3600;
const b64 = (b: Buffer) => b.toString("base64url");

export const challengeMessage = (address: string, nonce: string) => `Sign in to Kulaya\nAddress: ${address.toLowerCase()}\nNonce: ${nonce}`;

export async function newChallenge(address: string) {
  const nonce = randomBytes(16).toString("hex");
  await kv.set(`authnonce:${nonce}`, address.toLowerCase(), 300);
  return { nonce, message: challengeMessage(address, nonce) };
}

export type LoginMethod = "wallet" | "telegram";

/** `method` is recorded for auditing and future restrictions (e.g. money actions could demand a wallet login). */
export function signToken(address: string, secret: string, now = Date.now(), method: LoginMethod = "wallet"): string {
  const payload = b64(Buffer.from(JSON.stringify({ a: address.toLowerCase(), exp: Math.floor(now / 1000) + TTL_SEC, m: method })));
  return `${payload}.${b64(createHmac("sha256", secret).update(payload).digest())}`;
}

/** Returns the lower-cased address, or null when the token is malformed, forged or expired. */
export function verifyToken(token: string | null | undefined, secret: string, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const want = createHmac("sha256", secret).update(payload).digest();
  let got: Buffer;
  try { got = Buffer.from(sig, "base64url"); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const { a, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof a === "string" && /^0x[0-9a-f]{40}$/.test(a) && typeof exp === "number" && exp * 1000 > now ? a : null;
  } catch { return null; }
}

/** Single-use nonce + signature check. Returns a session token, or null if the proof is invalid. */
export async function completeChallenge(address: string, nonce: string, signature: string, secret: string): Promise<string | null> {
  const owner = await kv.get<string>(`authnonce:${nonce}`);
  if (!owner || String(owner).toLowerCase() !== address.toLowerCase()) return null;
  await kv.del(`authnonce:${nonce}`); // single use, even if the signature turns out to be bad
  const ok = await verifyMessage({ address: address as `0x${string}`, message: challengeMessage(address, nonce), signature: signature as `0x${string}` });
  return ok ? signToken(address, secret) : null;
}
