import { randomBytes } from "node:crypto";
import { fs } from "./util.js";

const FILE = ".cache/store.json";
type Store = {
  links: Record<string, string>; // telegram id -> merchant address
  pending: Record<string, { tgId: string; expires: number }>; // one-time link code
  cash: Record<string, { ts: number; amountRupiah: number; note: string }[]>; // bookkeeping only, never counts for credit
};
// ponytail: JSON file store, single process. Move to SQLite/Supabase if the bot ever runs on >1 instance.
const load = (): Store => fs.readJson<Store>(FILE) ?? { links: {}, pending: {}, cash: {} };

export const store = {
  linkedAddress: (tgId: string) => load().links[tgId] as `0x${string}` | undefined,
  newLinkCode(tgId: string) {
    const s = load();
    const code = randomBytes(6).toString("hex");
    s.pending[code] = { tgId, expires: Date.now() + 15 * 60_000 };
    fs.writeJson(FILE, s);
    return code;
  },
  /** Called only after the wallet signature over the code has been verified. */
  completeLink(code: string, address: string): string | null {
    const s = load();
    const p = s.pending[code];
    if (!p || p.expires < Date.now()) return null;
    s.links[p.tgId] = address;
    delete s.pending[code];
    fs.writeJson(FILE, s);
    return p.tgId;
  },
  addCash(address: string, amountRupiah: number, note: string) {
    const s = load();
    (s.cash[address.toLowerCase()] ??= []).push({ ts: Date.now(), amountRupiah, note: note.slice(0, 80) });
    fs.writeJson(FILE, s);
  },
  cashTotal: (address: string) => (load().cash[address.toLowerCase()] ?? []).reduce((a, x) => a + x.amountRupiah, 0),
};
