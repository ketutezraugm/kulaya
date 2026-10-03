"use client";
import type { Address } from "viem";
import { BOT_API, type useWallet } from "./web3";

type Wallet = NonNullable<ReturnType<typeof useWallet>["wallet"]>;
const key = (a: string) => `warung_session_${a.toLowerCase()}`;

/** Session tokens live in sessionStorage: they vanish when the tab closes and are never sent anywhere but our own API. */
export function getToken(address: Address): string | null {
  try { return sessionStorage.getItem(key(address)); } catch { return null; }
}
export function clearToken(address: Address) {
  try { sessionStorage.removeItem(key(address)); } catch { /* ignore */ }
}

/** Wallet sign-in: sign a one-time message (free, no gas), exchange it for a 12h token. */
export async function signIn(wallet: Wallet, address: Address): Promise<string> {
  const post = async (body: object) => {
    const r = await fetch(`${BOT_API}/auth`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "sign-in failed");
    return j;
  };
  const { nonce, message } = await post({ step: "challenge", address });
  const signature = await wallet.signMessage({ message });
  const { token } = await post({ step: "verify", address, nonce, signature });
  try { sessionStorage.setItem(key(address), token); } catch { /* keep going without persistence */ }
  return token as string;
}
