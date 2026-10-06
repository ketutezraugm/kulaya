/**
 * Seeds the demo merchant "Warung Bu Sri" on BSC testnet.
 *   npm run seed -- setup   fund wallets, mint mock IDRX, register merchant, fund the LP pool (once)
 *   npm run seed -- day     record one day of customer payments (run once per UTC day; safe to re-run)
 *   npm run seed -- status  print merchant facts
 * Credit history is time-gated by design (1-day epochs), so `day` has to run on several real days.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createWalletClient, parseEther, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { loadConfig } from "../server/config";
import { makeChain, getFacts, RP, erc20Abi, warungAbi, transportFor } from "../server/chain";
import { fs, rupiah, sleep } from "../server/util";

const PAYERS = 50;
const WALLETS = ".seed-wallets.json";
const MEMOS = ["nasi box 10 pcs", "pesanan kantor", "catering arisan", "bakso 20 mangkok", "es teh 30 gelas", "nasi kuning 15 porsi", "snack box pengajian", "tumpeng kecil", "gorengan 50 pcs", "soto ayam 12 porsi"];

const cfg = loadConfig(true);
const c = makeChain(cfg);
const idrx = cfg.IDRX_ADDRESS as Address;

type Wallets = { merchant: Hex; payers: Hex[] };
const wallets: Wallets = fs.readJson<Wallets>(WALLETS) ?? { merchant: generatePrivateKey(), payers: [] };
while (wallets.payers.length < PAYERS) wallets.payers.push(generatePrivateKey()); // grow the customer pool without losing existing wallets
fs.writeJson(WALLETS, wallets);

const deployerKey = /^PRIVATE_KEY=(0x[0-9a-fA-F]{64})/m.exec(readFileSync("../contracts/.env", "utf8"))?.[1] as Hex | undefined;

const client = (key: Hex) => createWalletClient({ account: privateKeyToAccount(key), chain: bscTestnet, transport: transportFor(cfg) });

/** BSC testnet rejects txs under 0.1 gwei; viem's 1559 tip estimate can undershoot, so send legacy at a safe price. */
async function gasPrice() {
  const g = await c.publicClient.getGasPrice();
  return g < 100_000_000n ? 120_000_000n : (g * 12n) / 10n;
}

/** Failover RPCs can lag a block, so pin the nonce to the pending count and retry nonce/timeout races. */
async function withNonce<T>(key: Hex, fn: (nonce: number) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const nonce = await c.publicClient.getTransactionCount({ address: privateKeyToAccount(key).address, blockTag: "pending" });
      return await fn(nonce);
    } catch (e) {
      if (attempt >= 5 || !/nonce|replacement|already known|timed out/i.test((e as Error).message)) throw e;
      await sleep(2500);
    }
  }
}

async function send(key: Hex, req: { address: Address; abi: any; functionName: string; args?: any[] }) {
  return withNonce(key, async (nonce) => {
    const hash = await client(key).writeContract({ ...req, nonce, type: "legacy", gasPrice: await gasPrice() } as any);
    const r = await c.publicClient.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`${req.functionName} reverted (${hash})`);
    return hash;
  });
}

async function sendTbnb(key: Hex, to: Address, bnb: string) {
  await withNonce(key, async (nonce) => {
    const hash = await client(key).sendTransaction({ to, value: parseEther(bnb), nonce, type: "legacy", gasPrice: await gasPrice() } as any);
    await c.publicClient.waitForTransactionReceipt({ hash });
  });
}

/** Run tasks with small concurrency and retries so public-RPC hiccups don't kill a seed run. */
async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      for (let attempt = 1; ; attempt++) {
        try { await fn(items[i], i); break; } catch (e) {
          if (attempt >= 3) { console.error(`  item ${i} failed: ${(e as Error).message.split("\n")[0]}`); break; }
          await sleep(1500 * attempt);
        }
      }
    }
  }));
}

const merchantAddr = privateKeyToAccount(wallets.merchant).address;
const payerAddrs = wallets.payers.map((k) => privateKeyToAccount(k).address);

async function setup() {
  if (!deployerKey) throw new Error("contracts/.env PRIVATE_KEY missing");
  const deployer = privateKeyToAccount(deployerKey).address;
  console.log("merchant (Warung Bu Sri):", merchantAddr);

  console.log("funding gas (tBNB)...");
  const need: [Address, string][] = [[merchantAddr, "0.0008"], ...payerAddrs.map((a) => [a, "0.0001"] as [Address, string])];
  const todo: [Address, string][] = [];
  for (const [a, amt] of need) if ((await c.publicClient.getBalance({ address: a })) < parseEther(amt) / 2n) todo.push([a, amt]);
  // sequential: a single funder account must keep its nonces ordered
  for (const [a, amt] of todo) await sendTbnb(deployerKey, a, amt);

  console.log("merchant register()...");
  const m = await c.read("merchants", [merchantAddr]);
  if (!m[0]) await send(wallets.merchant, { address: c.warung, abi: warungAbi, functionName: "register" });

  console.log("payers: mint IDRX + approve...");
  await pool(wallets.payers, 5, async (k, i) => {
    const a = payerAddrs[i];
    const bal: bigint = await c.publicClient.readContract({ address: idrx, abi: erc20Abi, functionName: "balanceOf", args: [a] });
    if (bal < 500_000n * RP) await send(k, { address: idrx, abi: erc20Abi, functionName: "mint", args: [a, 2_000_000n * RP] });
    const al: bigint = await c.publicClient.readContract({ address: idrx, abi: erc20Abi, functionName: "allowance", args: [a, c.warung] });
    if (al < 1_000_000n * RP) await send(k, { address: idrx, abi: erc20Abi, functionName: "approve", args: [c.warung, 2n ** 255n] });
  });

  console.log("LP pool: deposit Rp 100.000.000 from deployer...");
  const shares: bigint = await c.read("shares", [deployer]);
  if (shares === 0n) {
    const amt = 100_000_000n * RP;
    await send(deployerKey, { address: idrx, abi: erc20Abi, functionName: "mint", args: [deployer, amt] });
    await send(deployerKey, { address: idrx, abi: erc20Abi, functionName: "approve", args: [c.warung, amt] });
    await send(deployerKey, { address: c.warung, abi: warungAbi, functionName: "deposit", args: [amt] });
  }

  setEnv("REDTEAM_MERCHANT", merchantAddr);
  console.log("done. REDTEAM_MERCHANT written to app/.env.local");
}

function setEnv(k: string, v: string) {
  let s = readFileSync(".env.local", "utf8");
  s = new RegExp(`^${k}=`, "m").test(s) ? s.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`) : s.trimEnd() + `\n${k}=${v}\n`;
  writeFileSync(".env.local", s);
}

/** Optional 3rd arg: fund ANY registered shop instead of the demo shop (e.g. `npm run seed -- day 0xYourWallet`). */
const argTarget = process.argv[3];
if (argTarget && !/^0x[0-9a-fA-F]{40}$/.test(argTarget)) throw new Error("bad address");
const target = (argTarget ?? merchantAddr) as Address;

/** Keep the demo customers able to pay: gas from the deployer (sequential, one funder) and test IDRX minted when low. */
async function topUp(idx: number[]) {
  if (!deployerKey) throw new Error("contracts/.env PRIVATE_KEY missing");
  const gas: number[] = [];
  for (const i of idx) if ((await c.publicClient.getBalance({ address: payerAddrs[i] })) < parseEther("0.00005")) gas.push(i);
  if (gas.length) console.log(`topping up gas for ${gas.length} payers...`);
  for (const i of gas) await sendTbnb(deployerKey, payerAddrs[i], "0.0005");
  await pool(idx, 5, async (i) => {
    const bal: bigint = await c.publicClient.readContract({ address: idrx, abi: erc20Abi, functionName: "balanceOf", args: [payerAddrs[i]] });
    if (bal < 500_000n * RP) await send(wallets.payers[i], { address: idrx, abi: erc20Abi, functionName: "mint", args: [payerAddrs[i], 2_000_000n * RP] });
  });
}

/** One payment per payer per epoch: the contract only counts a capped amount per payer per day, so amounts stay at/below it. */
async function day() {
  const epoch: bigint = await c.read("currentEpoch");
  const f0 = await getFacts(c, target);
  if (!f0.registered) throw new Error(`${target} is not a registered shop yet (run /link in Telegram first)`);
  const cap = f0.params.payerEpochCap;
  const slot = argTarget ? `${epoch}:${target.toLowerCase()}` : epoch.toString(); // progress tracked per shop per day
  const done = fs.readJson<Record<string, string[]>>(".cache/seeded.json") ?? {};
  const already = new Set(done[slot] ?? []);
  const todo = wallets.payers.map((k, i) => ({ k, a: payerAddrs[i], i })).filter((p) => !already.has(p.a));
  console.log(`epoch ${epoch} -> ${target}: ${already.size} already paid, ${todo.length} to go`);
  await topUp(todo.map((p) => p.i));
  await pool(todo, 5, async (p) => {
    const amount = (cap * BigInt(85 + Math.floor(Math.random() * 16))) / 100n; // 85-100% of the per-payer cap
    const memo = MEMOS[Math.floor(Math.random() * MEMOS.length)];
    await send(p.k, { address: c.warung, abi: warungAbi, functionName: "pay", args: [target, amount, memo] });
    (done[slot] ??= []).push(p.a);
    fs.writeJson(".cache/seeded.json", done);
  });
  await status();
}

async function status() {
  const f = await getFacts(c, target);
  console.log({
    merchant: f.merchant, registered: f.registered, payers: f.payers, activeDays: f.activeDays,
    trailingRevenue: rupiah(f.trailingRevenue), creditLimit: rupiah(f.creditLimit), tier: f.tier,
    pool: rupiah(f.poolAssets), exposureCap: rupiah(f.exposureCap),
  });
}

const cmd = process.argv[2];
if (cmd === "setup") await setup();
else if (cmd === "day") await day();
else if (cmd === "status") await status();
else console.log("usage: npm run seed -- setup | day [shop address] | status [shop address]");
