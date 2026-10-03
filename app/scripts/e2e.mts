/**
 * Full loan cycle on BSC testnet with the seeded demo shop:
 *   AI proposes -> shop accepts -> customers pay -> repayment auto-splits -> loan closes -> ERC-8004 reputation updates.
 * Skips Gemini (calls the same propose_loan tool the model uses), so it burns no LLM quota.
 *   npm run e2e
 */
import { createWalletClient, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { loadConfig } from "../server/config";
import { makeChain, getFacts, getLoan, agentReputation, gasPrice, transportFor, warungAbi, erc20Abi } from "../server/chain";
import { runTool } from "../server/agent";
import { reportClosedLoans } from "../server/keeper";
import { fs, rupiah } from "../server/util";

const cfg = loadConfig(true);
const c = makeChain(cfg);
const wallets = fs.readJson<{ merchant: Hex; payers: Hex[] }>(".seed-wallets.json")!;
const merchant = privateKeyToAccount(wallets.merchant).address as Address;
const wc = (k: Hex) => createWalletClient({ account: privateKeyToAccount(k), chain: bscTestnet, transport: transportFor(cfg) });

async function tx(k: Hex, req: { address: Address; abi: any; functionName: string; args?: any[] }) {
  for (let attempt = 1; ; attempt++) {
    try {
      // failover RPCs can lag by a block: pin the nonce to the latest confirmed count from the same view we wait on
      const nonce = await c.publicClient.getTransactionCount({ address: privateKeyToAccount(k).address, blockTag: "pending" });
      const h = await wc(k).writeContract({ ...req, nonce, type: "legacy", gasPrice: await gasPrice(c) } as any);
      const r = await c.publicClient.waitForTransactionReceipt({ hash: h });
      if (r.status !== "success") throw new Error(`${req.functionName} reverted ${h}`);
      return h;
    } catch (e) {
      if (attempt >= 4 || !/nonce|replacement|already known|timed out/i.test((e as Error).message)) throw e;
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
}
const step = (s: string) => console.log(`\n== ${s}`);

process.on("unhandledRejection", (e) => { console.error("FAILED:", String((e as Error).message).split("\n")[0]); process.exit(1); });
const before = await agentReputation(c);
console.log("AI reputation before:", before);

step("1. AI proposes a loan (real tx from the underwriter key)");
let f = await getFacts(c, merchant);
console.log(`   revenue ${rupiah(f.trailingRevenue)}, contract credit limit ${rupiah(f.creditLimit)}, open loan: ${f.openLoan?.status ?? "none"}`);
let loanId: bigint;
if (f.openLoan) { loanId = f.openLoan.id; console.log("   reusing open loan", loanId); } else {
  const { result } = await runTool({ chain: c, merchant, sandbox: false }, "propose_loan", {
    principal_rupiah: Math.floor(Number(f.creditLimit / 100n) * 0.8 / 1000) * 1000, fee_percent: 3, repay_percent: 10, risk: "none",
    rationale_template: "Omzet {{revenue}} dari {{payers}} pelanggan selama {{days}} hari. Pinjaman {{principal}}, total yang dikembalikan {{total_owed}}, dipotong {{repay}} dari setiap penjualan.",
  }) as any;
  console.log("  ", JSON.stringify(result).slice(0, 400));
  if (!result.accepted) throw new Error("proposal rejected");
  loanId = BigInt(result.loan_id);
  console.log("   rationale:", result.rationale_for_owner);
}

step("2. Shop accepts from its own wallet");
if ((await getLoan(c, loanId)).status === "Proposed") await tx(wallets.merchant, { address: c.warung, abi: warungAbi, functionName: "acceptLoan", args: [loanId] });
let loan = await getLoan(c, loanId);
console.log(`   status ${loan.status}, owes ${rupiah(loan.total)}, ${loan.repayBps / 100}% of each sale`);

step("3. Customers keep buying; each sale auto-repays the pool");
const idrx = cfg.IDRX_ADDRESS as Address;
const poolBefore = await c.read("totalAssets");
let i = 0, sales = 0;
while (loan.status === "Active" && sales < 40) {
  const k = wallets.payers[i++ % wallets.payers.length];
  const payer = privateKeyToAccount(k).address;
  const bal: bigint = await c.publicClient.readContract({ address: idrx, abi: erc20Abi, functionName: "balanceOf", args: [payer] });
  if (bal < 500_000n * 100n) continue;
  await tx(k, { address: c.warung, abi: warungAbi, functionName: "pay", args: [merchant, 500_000n * 100n, "pesanan e2e"] });
  sales++;
  loan = await getLoan(c, loanId);
  console.log(`   sale ${sales}: repaid ${rupiah(loan.repaid)} / ${rupiah(loan.total)} (${loan.status})`);
}
if (loan.status !== "Repaid") throw new Error("loan did not close");

step("4. Keeper publishes the outcome to the AI's ERC-8004 reputation");
console.log("   reported loans:", await reportClosedLoans(c));

step("5. Results");
const poolAfter = await c.read("totalAssets");
f = await getFacts(c, merchant);
console.log(`   pool value ${rupiah(poolBefore)} -> ${rupiah(poolAfter)} (LP earned ${rupiah(BigInt(poolAfter) - BigInt(poolBefore))}, reserve ${rupiah(await c.read("reserve"))})`);
console.log(`   shop tier now ${f.tier}, new credit limit ${rupiah(f.creditLimit)}`);
console.log("   AI reputation after:", await agentReputation(c));
