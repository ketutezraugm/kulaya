/** Backfill the sales-history cache in Redis so the serverless API only ever scans a few recent chunks.
 *  npm run warm   (uses KV_REST_API_* from .env.local; re-run any time, it resumes from where it stopped) */
import { loadConfig } from "../server/config";
import { makeChain, getSales } from "../server/chain";
import { kv, kvConfigured } from "../server/kv";

if (!kvConfigured) throw new Error("KV_REST_API_URL / KV_REST_API_TOKEN missing: run `vercel env pull` first");
const cfg = loadConfig(true);
const c = makeChain(cfg);
for (let round = 1; ; round++) {
  const sales = await getSales(c, cfg.REDTEAM_MERCHANT as `0x${string}`);
  const cache = (await kv.get<{ scanned: string }>("sales:v1"))!;
  const head = await c.logsClient.getBlockNumber();
  console.log(`round ${round}: scanned to ${cache.scanned} / head ${head}, demo shop sales cached: ${sales.length}`);
  if (BigInt(cache.scanned) >= head - 1n) break;
}
