"use client";
import { useCallback, useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, fallback, http, parseAbi, type Address, type Hex } from "viem";
import { bscTestnet } from "viem/chains";

export const WARUNG = process.env.NEXT_PUBLIC_WARUNG_ADDRESS as Address;
export const IDRX = process.env.NEXT_PUBLIC_IDRX_ADDRESS as Address;
/** API routes live in this same Next.js app (app/app/api/*). */
export const BOT_API = "/api";
export const AGENT_ID = BigInt(process.env.NEXT_PUBLIC_AGENT_ID || 0);
export const IDENTITY = process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY as Address;
export const REPUTATION = process.env.NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY as Address;
export const ADAPTER = process.env.NEXT_PUBLIC_REPUTATION_ADAPTER as Address;
export const EXPLORER = "https://testnet.bscscan.com";

const rpcs = (process.env.NEXT_PUBLIC_RPC_URL ?? "").split(",").map((u) => u.trim()).filter(Boolean);
const mk = (u: string) => http(u, { timeout: 15_000, retryCount: 2 });
export const publicClient = createPublicClient({ chain: bscTestnet, transport: rpcs.length > 1 ? fallback(rpcs.map(mk)) : mk(rpcs[0]) });

export const warungAbi = parseAbi([
  "function register()",
  "function payWithPermit(address merchant, uint256 amount, string memo, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function pay(address merchant, uint256 amount, string memo)",
  "function deposit(uint256 amount) returns (uint256)",
  "function withdraw(uint256 sharesIn) returns (uint256)",
  "function acceptLoan(uint256 loanId)",
  "function relayNonces(address) view returns (uint256)",
  "function creditLimit(address) view returns (uint256)",
  "function trailingRevenue(address) view returns (uint256)",
  "function currentEpoch() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function idle() view returns (uint256)",
  "function loanedOut() view returns (uint256)",
  "function reserve() view returns (uint256)",
  "function totalShares() view returns (uint256)",
  "function shares(address) view returns (uint256)",
  "function nextLoanId() view returns (uint256)",
  "function epochRevenue(address merchant, uint256 epoch) view returns (uint256)",
  "function merchants(address) view returns (bool registered, bool defaulted, uint8 tier, uint32 payers, uint256 loanId)",
  "function loans(uint256) view returns (address merchant, uint8 status, uint16 repayBps, uint128 principal, uint128 total, uint128 repaid, uint64 proposedAt, uint64 acceptedAt, uint64 lastSaleAt, bytes32 reasonHash)",
  "function p() view returns (uint64 epochLength, uint64 lateAfter, uint64 proposalTtl, uint8 lookbackEpochs, uint8 minPayers, uint16 maxLoanBps, uint16 maxFeeBps, uint16 maxRepayBps, uint16 exposureBps, uint16 dailyBudgetBps, uint16 reserveBps, uint128 payerEpochCap, uint128 minPayment, uint128 baseTierMax)",
  "event Sale(address indexed merchant, address indexed payer, uint256 amount, uint256 repaidCut, string memo, uint256 epoch)",
]);
export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function mint(address, uint256)",
  "function nonces(address) view returns (uint256)",
]);
export const identityAbi = parseAbi(["function ownerOf(uint256) view returns (address)", "function tokenURI(uint256) view returns (string)"]);
export const reputationAbi = parseAbi(["function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)"]);

export const LOAN_STATUS = ["None", "Proposed", "Active", "Repaid", "Defaulted"] as const;

export const warungRead = (functionName: string, args: readonly unknown[] = []): Promise<any> =>
  publicClient.readContract({ address: WARUNG, abi: warungAbi, functionName: functionName as never, args: args as never });

/** IDRX has 2 decimals: 100_000_000 units = Rp 1.000.000 */
export const rupiah = (units: bigint | number) => "Rp " + (BigInt(units) / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const txLink = (h: string) => `${EXPLORER}/tx/${h}`;

declare global { interface Window { ethereum?: any } }

export function useWallet() {
  const [account, setAccount] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) { setError("No wallet found. Install MetaMask or open this page in Binance Web3 Wallet / Trust Wallet."); return null; }
    try {
      const [a] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
      try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x61" }] }); }
      catch {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x61", chainName: "BNB Smart Chain Testnet", nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 }, rpcUrls: ["https://bsc-testnet-rpc.publicnode.com"], blockExplorerUrls: [EXPLORER] }] });
      }
      setAccount(a);
      return a;
    } catch (e) { setError((e as Error).message.split("\n")[0]); return null; }
  }, []);

  useEffect(() => {
    window.ethereum?.request({ method: "eth_accounts" }).then((a: Address[]) => a[0] && setAccount(a[0])).catch(() => {});
    const h = (a: Address[]) => setAccount(a[0] ?? null);
    window.ethereum?.on?.("accountsChanged", h);
    return () => window.ethereum?.removeListener?.("accountsChanged", h);
  }, []);

  const wallet = account ? createWalletClient({ account, chain: bscTestnet, transport: custom(window.ethereum) }) : null;
  return { account, wallet, connect, error };
}

/** Send a contract write from the user's wallet and wait for the receipt. Returns the tx hash. */
export async function write(wallet: NonNullable<ReturnType<typeof useWallet>["wallet"]>, req: { address: Address; abi: any; functionName: string; args?: readonly unknown[] }): Promise<Hex> {
  // simulate first so a revert shows its reason instead of a wallet "cannot estimate gas" popup
  await publicClient.simulateContract({ ...req, account: wallet.account } as never);
  const hash = await wallet.writeContract(req as never);
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("transaction reverted");
  return hash;
}

export const errText = (e: unknown) => {
  const m = (e as any)?.shortMessage ?? (e as Error)?.message ?? String(e);
  return m.split("\n")[0].slice(0, 220);
};
