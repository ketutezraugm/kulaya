import { randomBytes } from "node:crypto";
import type { Msg } from "./llm";
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
  async history(tgId: string): Promise<Msg[]> {
    return (await kv.get<Msg[]>(`hist2:${tgId}`)) ?? [];
  },
  /** runAgent already returns text-only turns (no tool results, no audio), so this is small and never goes stale. */
  async saveHistory(tgId: string, h: Msg[]): Promise<void> {
    await kv.set(`hist2:${tgId}`, h, 24 * 3600);
  },
};
