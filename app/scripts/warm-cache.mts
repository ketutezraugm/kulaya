/** Backfill the contract-log index in Redis (sales, customer numbers, shop list) so the serverless API only ever scans a few recent chunks.
 *  npm run warm   (uses KV_REST_API_* from .env.local; re-run any time, it resumes from where it stopped)
 *  After a contract redeploy or an index-format change (the cache key is versioned: sales:v2), run it once before the next deploy. */
import { loadConfig } from "../server/config";
import { makeChain, syncLogs } from "../server/chain";
import { kvConfigured } from "../server/kv";

if (!kvConfigured) throw new Error("KV_REST_API_URL / KV_REST_API_TOKEN missing: run `vercel env pull` first");
const cfg = loadConfig(true);
const c = makeChain(cfg);
for (let round = 1; ; round++) {
  const cache = await syncLogs(c);
  const head = await c.logsClient.getBlockNumber();
  const sales = Object.values(cache.sales).reduce((a, l) => a + l.length, 0);
  console.log(`round ${round}: scanned to ${cache.scanned} / head ${head} | ${sales} sales, ${cache.shops.length} shops, ${Object.keys(cache.payers).length} shops with customers`);
  if (BigInt(cache.scanned) >= head - 1n) break;
  await new Promise((r) => setTimeout(r, 2500)); // the in-process throttle (2s) would otherwise return the same snapshot
}
