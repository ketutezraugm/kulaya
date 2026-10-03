import { z } from "zod";

const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "expected 0x address");
const key = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "expected 0x private key");

const schema = z.object({
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.8-flash"),
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  RPC_URL: z.string().min(8), // one URL, or several comma-separated for failover
  // eth_getLogs needs a node with historical logs: the official BNB nodes reject it, PublicNode prunes old logs, OnFinality keeps them (10k-block ranges)
  LOGS_RPC_URL: z.string().default("https://bnb-testnet.api.onfinality.io/public,https://bsc-testnet-rpc.publicnode.com"),
  CHAIN_ID: z.coerce.number().default(97),
  UNDERWRITER_PRIVATE_KEY: key,
  RELAYER_PRIVATE_KEY: key.optional(), // pays gas for users' signed actions; separate from the AI key and holds only gas money
  WARUNG_ADDRESS: addr,
  IDRX_ADDRESS: addr,
  REPUTATION_ADAPTER: addr.optional(),
  ERC8004_REPUTATION_REGISTRY: addr,
  AGENT_ID: z.coerce.number().int().positive(),
  DEPLOY_BLOCK: z.coerce.bigint().default(0n),
  APP_URL: z.string().url().default("http://localhost:3000"),
  REDTEAM_RATE_LIMIT: z.coerce.number().default(20),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
  REDTEAM_MERCHANT: addr.optional(),
  PORT: z.coerce.number().default(8787),
});

export type Config = z.infer<typeof schema>;

/** Lazy so scripts that only need the chain don't need Gemini/Telegram keys. */
export function loadConfig(partial = false): Config {
  const s = partial ? schema.partial({ GEMINI_API_KEY: true, TELEGRAM_BOT_TOKEN: true }) : schema;
  const r = s.safeParse(process.env);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
    throw new Error(`Bad environment:\n  ${msg}`);
  }
  return r.data as Config;
}
