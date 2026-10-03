/** Live sandbox run of the real agent against the real contract (never broadcasts).
 *  npm run check -- "Saya mau pinjam modal"            */
import { loadConfig } from "../server/config";
import { makeChain } from "../server/chain";
import { makeLLM } from "../server/llm";
import { runAgent } from "../server/agent";

const cfg = loadConfig();
const chain = makeChain(cfg);
const llm = makeLLM(cfg, cfg.LLM_CHAIN);
console.log("providers:", llm.providers.join(", "));
const merchant = (process.argv[3] ?? cfg.REDTEAM_MERCHANT) as `0x${string}`;
const r = await runAgent(llm, { chain, merchant, sandbox: true, injectedMemo: process.env.MEMO }, [], { text: process.argv[2] ?? "Halo, bagaimana penjualan saya?" });
for (const t of r.trace) console.log(`\n[tool] ${t.tool}(${JSON.stringify(t.args)})\n  -> ${JSON.stringify(t.result).slice(0, 700)}`);
console.log(`\n[agent] ${r.text}`);
