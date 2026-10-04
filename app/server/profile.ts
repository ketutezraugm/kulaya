import { kv } from "./kv";

/** Shop name (public) and owner nickname (private, used for greetings). Stored in KV, keyed by wallet address. */
export type Profile = { name: string; nickname: string; updatedAt: number };

const ALLOWED = /^[\p{L}\p{N} .,'&()\/-]+$/u;

/**
 * Display text must be safe to show to strangers on the public shop page and in chat: no links, no handles,
 * no control or markup characters. Returns the cleaned text, or null when it is invalid.
 */
export function cleanText(input: unknown, min: number, max: number): string | null {
  if (typeof input !== "string") return null;
  const s = input.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length < min || s.length > max) return null;
  if (!ALLOWED.test(s) || /https?:|www\.|\.(com|id|io|xyz|me)\b/i.test(s)) return null;
  return s;
}

const key = (address: string) => `profile:${address.toLowerCase()}`;

export async function getProfile(address: string): Promise<Profile | null> {
  return kv.get<Profile>(key(address));
}

export async function saveProfile(address: string, name: string, nickname: string): Promise<Profile> {
  const p: Profile = { name, nickname, updatedAt: Date.now() };
  await kv.set(key(address), p);
  return p;
}
