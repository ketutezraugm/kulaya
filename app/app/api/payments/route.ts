import type { Address } from "viem";
import { getRuntime, json, errorResponse, clientIp, limited } from "@/server/runtime";
import { getSalesAfter } from "@/server/chain";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Live payment feed for the "Pembayaran diterima!" screen.
 *   GET ?merchant=0x…            → { head }                 (the cursor to start polling from)
 *   GET ?merchant=0x…&after=<n>  → { head, sales: [...] }   (sales of that shop mined after block n)
 * Never cached: this is polled every few seconds while a QR is on screen.
 */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const m = u.searchParams.get("merchant") ?? "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(m)) return json({ error: "bad merchant" }, 400);
    if (await limited(`payments:${clientIp(req)}`, 600, 3600)) return json({ error: "slow down" }, 429); // ~1 poll / 6s sustained
    const afterRaw = u.searchParams.get("after");
    const after = afterRaw !== null && /^\d{1,12}$/.test(afterRaw) ? BigInt(afterRaw) : null;
    const { head, sales } = await getSalesAfter(getRuntime().chain, m as Address, after ?? 0n);
    return json({ head, sales: after === null ? [] : sales }, 200, { "cache-control": "no-store" });
  } catch (e) { return errorResponse(e); }
}
