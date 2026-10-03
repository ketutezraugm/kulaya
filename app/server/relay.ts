import { createWalletClient, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { z } from "zod";
import { transportFor, gasPrice, type Chain } from "./chain";
import { warungAbi, erc20Abi } from "./abi";
import { revertReason } from "./agent";
import { limited, withLock } from "./kv";

/**
 * Gasless relayer: users sign EIP-712 messages, this wallet submits them and pays the gas.
 * Safe by construction: the contract only moves value to what the user signed for, so the relayer can delay or drop a
 * message but never alter or replay it. The relayer key holds only gas money and is separate from the AI underwriter key.
 * Guards here protect the relayer's gas budget: strict schemas, only 4 allowed actions, simulate before send,
 * gas cap, per-IP / per-address / daily limits, and a balance floor.
 */

const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const hex = z.string().regex(/^0x[0-9a-fA-F]+$/).max(400);
const uint = z.string().regex(/^\d{1,40}$/);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("register"), merchant: addr, deadline: uint, sig: hex }),
  z.object({ action: z.literal("accept"), loanId: uint, deadline: uint, sig: hex }),
  z.object({
    action: z.literal("pay"), payer: addr, merchant: addr, amount: uint, memo: z.string().max(140), deadline: uint, sig: hex,
    permit: z.object({ deadline: uint, v: z.number().int().min(0).max(255), r: z.string().regex(/^0x[0-9a-fA-F]{64}$/), s: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }),
  }),
  z.object({ action: z.literal("faucet"), address: addr }),
]);

const MAX_GAS = 600_000n;
const DAILY_TX_CAP = 500;
const MIN_BALANCE = 2_000_000_000_000_000n; // 0.002 tBNB floor so the relayer never strands itself mid-flow
const FAUCET_UNITS = 100_000_000n; // Rp 1.000.000 of mock IDRX

export type RelayResult = { status: number; body: unknown };

export function makeRelayer(chain: Chain) {
  const key = chain.cfg.RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!key) return { enabled: false as const, address: null, handle: async (_raw: unknown, _ip: string): Promise<RelayResult> => ({ status: 503, body: { error: "relayer disabled" } }) };
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: bscTestnet, transport: transportFor(chain.cfg) });
  const { publicClient, warung } = chain;
  const idrx = chain.cfg.IDRX_ADDRESS as Address;

  async function submit(req: { address: Address; abi: any; functionName: string; args: any[] }): Promise<RelayResult> {
    // simulate with the real contract first: a bad signature, expired deadline or reverting action never costs gas
    let gas: bigint;
    try {
      await publicClient.simulateContract({ ...req, account } as never);
      gas = await publicClient.estimateContractGas({ ...req, account } as never);
    } catch (e) { return { status: 400, body: { error: "rejected by contract", revert: revertReason(e) } }; }
    if (gas > MAX_GAS) return { status: 400, body: { error: "gas too high" } };
    // one send at a time from the relayer key across all serverless instances (nonce safety)
    return withLock("relayer", async () => {
      const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
      const hash = await wallet.writeContract({ ...req, nonce, gas: (gas * 13n) / 10n, type: "legacy", gasPrice: await gasPrice(chain) } as never);
      const r = await publicClient.waitForTransactionReceipt({ hash });
      return r.status === "success" ? { status: 200, body: { hash } } : { status: 500, body: { error: "transaction reverted", hash } };
    });
  }

  return {
    enabled: true as const,
    address: account.address,
    async handle(raw: unknown, ip: string): Promise<RelayResult> {
      const parsed = Body.safeParse(raw);
      if (!parsed.success) return { status: 400, body: { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 200) } };
      const b = parsed.data;
      if ((await limited(`relay:ip:${ip}`, 60, 3600)) || (await limited("relay:global:day", DAILY_TX_CAP, 86_400))) return { status: 429, body: { error: "relayer rate limit, try again later" } };
      if ((await publicClient.getBalance({ address: account.address })) < MIN_BALANCE) return { status: 503, body: { error: "relayer is out of gas money" } };

      switch (b.action) {
        case "register":
          return submit({ address: warung, abi: warungAbi, functionName: "registerFor", args: [b.merchant, BigInt(b.deadline), b.sig] });
        case "accept":
          return submit({ address: warung, abi: warungAbi, functionName: "acceptLoanFor", args: [BigInt(b.loanId), BigInt(b.deadline), b.sig] });
        case "pay":
          return submit({ address: warung, abi: warungAbi, functionName: "payFor", args: [b.payer, b.merchant, BigInt(b.amount), b.memo, BigInt(b.deadline), b.sig, BigInt(b.permit.deadline), b.permit.v, b.permit.r, b.permit.s] });
        case "faucet":
          // testnet convenience: free mock IDRX so a brand-new wallet can try the app with zero BNB
          if ((await limited(`faucet:${b.address.toLowerCase()}`, 3, 86_400)) || (await limited(`faucetip:${ip}`, 10, 86_400))) return { status: 429, body: { error: "faucet limit reached for today" } };
          return submit({ address: idrx, abi: erc20Abi, functionName: "mint", args: [b.address, FAUCET_UNITS] });
      }
    },
  };
}
export type Relayer = ReturnType<typeof makeRelayer>;
