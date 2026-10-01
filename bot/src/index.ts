import { loadConfig } from "./config.js";
import { makeChain } from "./chain.js";
import { makeModel } from "./agent.js";
import { startServer } from "./server.js";
import { makeBot } from "./telegram.js";
import { reportClosedLoans } from "./keeper.js";
import { makeRelayer } from "./relay.js";

const cfg = loadConfig();
const chain = makeChain(cfg);
const model = makeModel(cfg.GEMINI_API_KEY, cfg.GEMINI_MODEL, cfg.GEMINI_FALLBACK_MODEL);
const { bot, notifyLinked } = makeBot(chain, model);

const relayer = makeRelayer(chain);
startServer(chain, model, relayer, notifyLinked);
console.log(relayer.enabled ? `gasless relayer ${relayer.address}` : "gasless relayer disabled (no RELAYER_PRIVATE_KEY)");
console.log(`agent ${chain.agent.address} (ERC-8004 #${cfg.AGENT_ID}) on warung ${chain.warung}`);
// publish closed-loan outcomes to the agent's ERC-8004 reputation (permissionless on-chain; the bot just pays the gas)
setInterval(() => reportClosedLoans(chain).catch((e) => console.error("keeper:", String(e.message).split("\n")[0])), 60_000);
bot.start({ onStart: (me) => console.log(`telegram: @${me.username}`) });
