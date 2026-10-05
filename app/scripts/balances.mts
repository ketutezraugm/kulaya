// Gas-money check before a demo: prints tBNB balances of the relayer (pays users' gas) and the AI wallet. Public addresses only.
// Relayer refuses to run below 0.002 tBNB. Faucet: https://www.bnbchain.org/en/testnet-faucet
import { createPublicClient, formatEther, http } from "viem";
import { bscTestnet } from "viem/chains";

const rpc = (process.env.RPC_URL ?? "").split(",")[0].trim();
const c = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
const wallets = { relayer: "0x15c3e5B24aA0E3bCf6693a7f2C20052ec60A828c", "AI wallet": "0xA13B769d9b9777d49f73491379007dc4C2A1dc78" } as const;
for (const [name, a] of Object.entries(wallets)) {
  const b = await c.getBalance({ address: a as `0x${string}` });
  console.log(`${name.padEnd(10)} ${a}  ${formatEther(b)} tBNB  ${b < 2_000_000_000_000_000n ? "LOW: top up" : "ok"}`);
}
