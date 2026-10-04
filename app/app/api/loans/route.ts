import type { Address } from "viem";
import { getRuntime, json, errorResponse } from "@/server/runtime";
import { getLoanHistory } from "@/server/chain";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET ?merchant=0x… → every loan of that shop, newest first, with "Expired" derived for stale offers. Public (it is on-chain anyway). */
export async function GET(req: Request) {
  try {
    const m = new URL(req.url).searchParams.get("merchant") ?? "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(m)) return json({ error: "bad merchant" }, 400);
    const loans = await getLoanHistory(getRuntime().chain, m as Address);
    return json({ loans }, 200, { "cache-control": "public, s-maxage=10, stale-while-revalidate=60" });
  } catch (e) { return errorResponse(e); }
}
