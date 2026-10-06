// Checks the demo seeding wallets (.seed-wallets.json): tBNB for gas and test IDRX for payments. Prints addresses and balances only.
//   npx tsx --env-file=.env.local scripts/seed-check.mts
import { readFileSync } from "node:fs";
import { createPublicClient, formatEther, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";

const w = JSON.parse(readFileSync(".seed-wallets.json", "utf8")) as { merchant: Hex; payers: Hex[] };
const c = createPublicClient({ chain: bscTestnet, transport: http((process.env.RPC_URL ?? "").split(",")[0].trim()) });
const idrx = process.env.IDRX_ADDRESS as Address;
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
let lowGas = 0, lowIdrx = 0;
for (const k of w.payers) {
  const a = privateKeyToAccount(k).address;
  const [bnb, tok] = await Promise.all([c.getBalance({ address: a }), c.readContract({ address: idrx, abi: erc20, functionName: "balanceOf", args: [a] })]);
  if (bnb < 50_000_000_000_000n) lowGas++;
  if (tok < 25_000_000n) lowIdrx++;
}
const first = privateKeyToAccount(w.payers[0]).address;
console.log(`${w.payers.length} payers; ${lowGas} below 0.00005 tBNB, ${lowIdrx} below Rp 250.000 test IDRX`);
console.log("example payer", first, formatEther(await c.getBalance({ address: first })), "tBNB");
