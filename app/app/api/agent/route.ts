import { after } from "next/server";
import { getRuntime, json, errorResponse } from "@/server/runtime";
import { getParams, agentReputation, getStats } from "@/server/chain";
import { reportClosedLoans } from "@/server/keeper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const { chain, cfg } = getRuntime();
    // serverless has no background timer: closed loans are published to ERC-8004 opportunistically (rate-limited inside)
    after(() => reportClosedLoans(chain).catch((e) => console.error("keeper:", String(e.message).split("\n")[0])));
    const [params, rep, poolAssets, loanedOut, reserve, stats] = await Promise.all([getParams(chain), agentReputation(chain), chain.read("totalAssets"), chain.read("loanedOut"), chain.read("reserve"), getStats(chain).catch(() => null)]);
    return json(
      { agentId: cfg.AGENT_ID, agentAddress: chain.agent.address, warung: chain.warung, reputation: rep, pool: { assets: poolAssets, loanedOut, reserve }, stats, caps: params },
      200, { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" },
    );
  } catch (e) { return errorResponse(e); }
}
