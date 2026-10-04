import type { Shop } from "./shop";

export const LEVELS = ["Perintis", "Berkembang", "Maju", "Unggul"] as const;
export const MIN_LOAN_RP = 50_000n; // mirrors server/policy.ts MIN_PRINCIPAL

export type Capital =
  | { kind: "not"; payersLeft: number }
  | { kind: "low" }
  | { kind: "ok" }
  | { kind: "offer"; expiresAt: number }
  | { kind: "active"; pct: number }
  | { kind: "repaid" }
  | { kind: "def" };

/** The six capital states of the owner's home screen, derived only from chain-read shop data. */
export function capitalState(shop: Shop, now = Date.now()): Capital {
  const l = shop.loan;
  if (shop.defaulted || l?.status === "Defaulted") return { kind: "def" };
  if (l?.status === "Active") return { kind: "active", pct: l.total > 0n ? Number((l.repaid * 100n) / l.total) : 0 };
  if (l?.status === "Proposed") {
    const expiresAt = Number(l.proposedAt + shop.params.proposalTtl) * 1000;
    if (now <= expiresAt) return { kind: "offer", expiresAt };
  }
  if (l?.status === "Repaid") return { kind: "repaid" };
  if (shop.payers < shop.params.minPayers) return { kind: "not", payersLeft: shop.params.minPayers - shop.payers };
  if (shop.creditLimit < MIN_LOAN_RP * 100n) return { kind: "low" };
  return { kind: "ok" };
}

/** e.g. "Sel 14.30" */
export const whenId = (ms: number) => new Date(ms).toLocaleString("id-ID", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export const greeting = (d = new Date()) => { const h = d.getHours(); return h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam"; };
