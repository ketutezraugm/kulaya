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
    // Persist the conversation text only. Tool calls/results are deliberately dropped: they are snapshots of live chain
    // data and go stale in minutes, and a model that sees an old "credit limit 0" will repeat it instead of re-checking.
    // Raw voice audio is replaced with a marker so the stored history stays small.
    const slim = h
      .map((c) => ({ ...c, parts: c.parts?.filter((p) => !p.functionCall && !p.functionResponse).map((p) => (p.inlineData ? { text: "[voice note]" } : p)) }))
      .filter((c) => c.parts && c.parts.length > 0);
    await kv.set(`hist:${tgId}`, slim, 24 * 3600);
  },
};
