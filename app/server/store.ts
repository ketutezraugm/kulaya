import { randomBytes } from "node:crypto";
import type { Content } from "@google/genai";
import { kv } from "./kv";

/** Chat state on top of the KV layer: Telegram<->wallet links, one-time link codes, bookkeeping, conversation memory. */
export const store = {
  async linkedAddress(tgId: string): Promise<`0x${string}` | undefined> {
    const a = await kv.get<string>(`link:${tgId}`);
    return a ? (String(a) as `0x${string}`) : undefined;
  },
  async newLinkCode(tgId: string): Promise<string> {
    const code = randomBytes(6).toString("hex");
    await kv.set(`linkcode:${code}`, tgId, 15 * 60);
    return code;
  },
  /** Called only after the wallet signature over the code has been verified. */
  async completeLink(code: string, address: string): Promise<string | null> {
    const tg = await kv.get<string | number>(`linkcode:${code}`);
    if (tg === null) return null;
    await kv.set(`link:${tg}`, address);
    await kv.del(`linkcode:${code}`);
    return String(tg);
  },
  /** Cash sales are bookkeeping only and never count toward credit. */
  addCash: (address: string, amountRupiah: number) => kv.incr(`cash:${address.toLowerCase()}`, undefined, amountRupiah),
  async cashTotal(address: string): Promise<number> {
    return Number((await kv.get<number>(`cash:${address.toLowerCase()}`)) ?? 0);
  },
  async history(tgId: string): Promise<Content[]> {
    return (await kv.get<Content[]>(`hist:${tgId}`)) ?? [];
  },
  async saveHistory(tgId: string, h: Content[]): Promise<void> {
    // never persist raw voice audio: replace it with a marker so the stored history stays small
    const slim = h.map((c) => ({ ...c, parts: c.parts?.map((p) => (p.inlineData ? { text: "[voice note]" } : p)) }));
    await kv.set(`hist:${tgId}`, slim, 24 * 3600);
  },
};
