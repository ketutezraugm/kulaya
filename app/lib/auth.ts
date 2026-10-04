"use client";
import type { Address } from "viem";
import { BOT_API, type useWallet } from "./web3";

type Wallet = NonNullable<ReturnType<typeof useWallet>["wallet"]>;
export type Session = { address: Address; token: string; method: "wallet" | "telegram" };
const KEY = "kulaya_session";

/**
 * One session per browser tab-session (sessionStorage: gone when the tab closes, never sent anywhere but our own API).
 * It records WHO the owner is and HOW they logged in; money actions still need a wallet signature either way.
 */
export function loadSession(): Session | null {
  try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); return s?.token && s?.address ? (s as Session) : null; } catch { return null; }
}
export function saveSession(s: Session) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* keep going without persistence */ }
}
export function clearSession() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** The token for this wallet address, if the current session belongs to it. */
export function getToken(address: Address): string | null {
  const s = loadSession();
  return s && s.address.toLowerCase() === address.toLowerCase() ? s.token : null;
}
export function clearToken(address: Address) {
  if (getToken(address)) clearSession();
}

async function post(path: string, body: object) {
  const r = await fetch(`${BOT_API}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "sign-in failed");
  return j;
}

/** Wallet sign-in: sign a one-time message (free, no gas), exchange it for a 12h token. */
export async function signIn(wallet: Wallet, address: Address): Promise<string> {
  const { nonce, message } = await post("/auth", { step: "challenge", address });
  const signature = await wallet.signMessage({ message });
  const { token } = await post("/auth", { step: "verify", address, nonce, signature });
  saveSession({ address, token, method: "wallet" });
  return token as string;
}

/** Telegram one-tap login: trade the single-use code from the bot's link for a session. */
export async function loginWithTelegramCode(code: string): Promise<Session> {
  const { token, address } = await post("/auth/telegram", { code });
  const s: Session = { address, token, method: "telegram" };
  saveSession(s);
  return s;
}
