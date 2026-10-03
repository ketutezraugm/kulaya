/** Live sandbox run of the real agent against the real contract (never broadcasts).
 *  npm run check -- "Saya mau pinjam modal"            */
import { loadConfig } from "../server/config";
import { makeChain } from "../server/chain";
import { makeModel, runAgent } from "../server/agent";

const cfg = loadConfig();
const chain = makeChain(cfg);
const model = makeModel(cfg.GEMINI_API_KEY, cfg.GEMINI_MODEL, cfg.GEMINI_FALLBACK_MODEL);
const merchant = (process.argv[3] ?? cfg.REDTEAM_MERCHANT) as `0x${string}`;
const r = await runAgent(model, { chain, merchant, sandbox: true, injectedMemo: process.env.MEMO }, [], [{ text: process.argv[2] ?? "Halo, bagaimana penjualan saya?" }]);
for (const t of r.trace) console.log(`\n[tool] ${t.tool}(${JSON.stringify(t.args)})\n  -> ${JSON.stringify(t.result).slice(0, 700)}`);
console.log(`\n[agent] ${r.text}`);
