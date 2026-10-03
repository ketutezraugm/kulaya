import { getRuntime, json, errorResponse } from "@/server/runtime";
import { getSales } from "@/server/chain";
import type { Address } from "viem";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const m = new URL(req.url).searchParams.get("merchant") ?? "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(m)) return json({ error: "bad merchant" }, 400);
    const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 10));
    const sales = await getSales(getRuntime().chain, m as Address);
    return json({ sales: sales.slice(-limit).reverse() }, 200, { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" });
  } catch (e) { return errorResponse(e); }
}
