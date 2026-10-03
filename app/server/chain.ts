import { createPublicClient, createWalletClient, fallback, http, type Address, type Hex, keccak256, toHex, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { kv } from "./kv";
import { warungAbi, erc20Abi, reputationAbi, LOAN_STATUS, type LoanStatus } from "./abi";
import type { Config } from "./config";

export const RP = 100n; // IDRX has 2 decimals: 1 rupiah = 100 units

/** Public testnet RPCs are flaky (timeouts, 520s). Try each endpoint in order, with per-request retries. */
export function transportFor(cfg: Pick<Config, "RPC_URL">, opts: { retryCount?: number; retryDelay?: number } = {}) {
  const urls = cfg.RPC_URL.split(",").map((u) => u.trim()).filter(Boolean);
  const mk = (u: string) => http(u, { timeout: 15_000, retryCount: opts.retryCount ?? 2, retryDelay: opts.retryDelay });
  return urls.length > 1 ? fallback(urls.map(mk)) : mk(urls[0]);
}

export function makeChain(cfg: Config) {
  const transport = transportFor(cfg);
  const publicClient = createPublicClient({ chain: bscTestnet, transport });
  const agent = privateKeyToAccount(cfg.UNDERWRITER_PRIVATE_KEY as Hex);
  const agentWallet = createWalletClient({ account: agent, chain: bscTestnet, transport });
  const warung = cfg.WARUNG_ADDRESS as Address;
  const read = (fn: string, args: readonly unknown[] = []): Promise<any> =>
    publicClient.readContract({ address: warung, abi: warungAbi, functionName: fn as never, args: args as never });
  // separate client for historical logs (see LOGS_RPC_URL); rate-limited public node, so retry with backoff
  const logsClient = createPublicClient({ chain: bscTestnet, transport: transportFor({ RPC_URL: cfg.LOGS_RPC_URL }, { retryCount: 5, retryDelay: 800 }) });
  return { cfg, publicClient, logsClient, agent, agentWallet, warung, read };
}
export type Chain = ReturnType<typeof makeChain>;

export type Params = {
  epochLength: bigint; lateAfter: bigint; proposalTtl: bigint; lookbackEpochs: number; minPayers: number;
  maxLoanBps: number; maxFeeBps: number; maxRepayBps: number; exposureBps: number; dailyBudgetBps: number; reserveBps: number;
  payerEpochCap: bigint; minPayment: bigint; baseTierMax: bigint;
};

export async function getParams(c: Chain): Promise<Params> {
  const r = await c.read("p");
  const k = ["epochLength", "lateAfter", "proposalTtl", "lookbackEpochs", "minPayers", "maxLoanBps", "maxFeeBps", "maxRepayBps", "exposureBps", "dailyBudgetBps", "reserveBps", "payerEpochCap", "minPayment", "baseTierMax"];
  return Object.fromEntries(k.map((n, i) => [n, r[i]])) as Params;
}

export type Loan = {
  id: bigint; merchant: Address; status: LoanStatus; repayBps: number; principal: bigint; total: bigint; repaid: bigint;
  proposedAt: bigint; acceptedAt: bigint; lastSaleAt: bigint; reasonHash: Hex;
};

export async function getLoan(c: Chain, id: bigint): Promise<Loan> {
  const r = await c.read("loans", [id]);
  return { id, merchant: r[0], status: LOAN_STATUS[r[1]], repayBps: r[2], principal: r[3], total: r[4], repaid: r[5], proposedAt: r[6], acceptedAt: r[7], lastSaleAt: r[8], reasonHash: r[9] };
}

export type Sale = { payer: Address; amount: bigint; repaidCut: bigint; memo: string; epoch: bigint; block: bigint; tx: Hex };

/** Facts about a merchant, computed from chain state by code. The LLM only ever sees these, never makes them up. */
export type Facts = {
  merchant: Address; registered: boolean; defaulted: boolean; tier: number; payers: number;
  creditLimit: bigint; trailingRevenue: bigint; activeDays: number; dailyRevenue: { epoch: bigint; counted: bigint }[];
  openLoan: Loan | null; poolAssets: bigint; poolIdle: bigint; exposureCap: bigint; params: Params;
};

export async function getFacts(c: Chain, merchant: Address): Promise<Facts> {
  const [m, params, limit, trailing, epoch, poolAssets, poolIdle] = await Promise.all([
    c.read("merchants", [merchant]), getParams(c), c.read("creditLimit", [merchant]), c.read("trailingRevenue", [merchant]),
    c.read("currentEpoch"), c.read("totalAssets"), c.read("idle"),
  ]);
  const n = Math.min(params.lookbackEpochs, Number(epoch) + 1);
  const days = await Promise.all(Array.from({ length: n }, (_, i) => c.read("epochRevenue", [merchant, epoch - BigInt(i)]).then((v: bigint) => ({ epoch: epoch - BigInt(i), counted: v }))));
  const dailyRevenue = days.reverse();
  const loanId: bigint = m[4];
  const loan = loanId > 0n ? await getLoan(c, loanId) : null;
  const open = loan && (loan.status === "Active" || loan.status === "Proposed") ? loan : null;
  return {
    merchant, registered: m[0], defaulted: m[1], tier: m[2], payers: m[3], creditLimit: limit, trailingRevenue: trailing,
    activeDays: dailyRevenue.filter((d) => d.counted > 0n).length, dailyRevenue, openLoan: open,
    poolAssets, poolIdle, exposureCap: (poolAssets * BigInt(params.exposureBps)) / 10_000n, params,
  };
}

// ── Sale history from logs (memos + payer concentration). Incremental scan, cached in KV so serverless calls stay cheap. ──
const CACHE_KEY = "sales:v1";
const KEEP_PER_MERCHANT = 500;
const MAX_CHUNKS_PER_CALL = 30; // bounds work per invocation; a long gap is caught up over a few calls
type StoredSale = Omit<Sale, "amount" | "repaidCut" | "epoch" | "block"> & { amount: string; repaidCut: string; epoch: string; block: string };
type CacheFile = { scanned: string; sales: Record<string, StoredSale[]> };

export async function getSales(c: Chain, merchant: Address): Promise<Sale[]> {
  const cache: CacheFile = (await kv.get<CacheFile>(CACHE_KEY)) ?? { scanned: (c.cfg.DEPLOY_BLOCK - 1n).toString(), sales: {} };
  const head = await c.logsClient.getBlockNumber();
  let from = BigInt(cache.scanned) + 1n;
  const STEP = 9_999n; // the log nodes that keep history allow 10k-block ranges
  const saleEvent = warungAbi.find((x) => x.type === "event" && x.name === "Sale") as never;
  let dirty = false;
  for (let i = 0; from <= head && i < MAX_CHUNKS_PER_CALL; i++) {
    const to = from + STEP - 1n > head ? head : from + STEP - 1n;
    const logs = await c.logsClient.getLogs({ address: c.warung, event: saleEvent, fromBlock: from, toBlock: to });
    for (const l of logs as any[]) {
      const a = l.args;
      const list = (cache.sales[a.merchant.toLowerCase()] ??= []);
      list.push({ payer: a.payer, amount: a.amount.toString(), repaidCut: a.repaidCut.toString(), memo: a.memo, epoch: a.epoch.toString(), block: l.blockNumber.toString(), tx: l.transactionHash });
      if (list.length > KEEP_PER_MERCHANT) list.shift();
    }
    cache.scanned = to.toString();
    from = to + 1n;
    dirty = true;
  }
  if (dirty) await kv.set(CACHE_KEY, cache);
  return (cache.sales[merchant.toLowerCase()] ?? []).map((s) => ({ ...s, amount: BigInt(s.amount), repaidCut: BigInt(s.repaidCut), epoch: BigInt(s.epoch), block: BigInt(s.block) }));
}

/** Share of counted-window revenue coming from the single biggest payer (0..1). Used as a deterministic fraud signal. */
export function topPayerShare(sales: Sale[]): number {
  const by = new Map<string, bigint>();
  let total = 0n;
  for (const s of sales) { by.set(s.payer, (by.get(s.payer) ?? 0n) + s.amount); total += s.amount; }
  if (total === 0n) return 0;
  return Number((([...by.values()].reduce((a, b) => (b > a ? b : a), 0n)) * 10_000n) / total) / 10_000;
}

export const reasonHash = (text: string): Hex => keccak256(toHex(text));

export async function agentReputation(c: Chain) {
  if (!c.cfg.REPUTATION_ADAPTER) return null;
  const [count, value, dec] = await c.publicClient.readContract({
    address: c.cfg.ERC8004_REPUTATION_REGISTRY as Address, abi: reputationAbi, functionName: "getSummary",
    args: [BigInt(c.cfg.AGENT_ID), [c.cfg.REPUTATION_ADAPTER as Address], "warung-loan", ""],
  });
  return { count: Number(count), average: count > 0n ? Number(value) / Number(count) / 10 ** dec : null };
}

export { warungAbi, erc20Abi, decodeEventLog };

/** BSC testnet rejects txs under 0.1 gwei, and viem's 1559 tip estimate can undershoot: send legacy at a safe price. */
export async function gasPrice(c: Chain): Promise<bigint> {
  const g = await c.publicClient.getGasPrice();
  return g < 100_000_000n ? 120_000_000n : (g * 12n) / 10n;
}
