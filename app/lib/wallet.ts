"use client";

/**
 * Wallet picker for phones without a wallet extension. A normal phone browser has no window.ethereum, so we use
 * WalletConnect: the user picks their wallet app (or scans a QR on desktop), approves once, and we get a standard
 * EIP-1193 provider. Loaded lazily, so people with an injected wallet never download any of it.
 * Needs a free project id from https://cloud.reown.com in NEXT_PUBLIC_WC_PROJECT_ID; without it, this stays disabled.
 */
export type Eip1193 = {
  request(args: { method: string; params?: unknown }): Promise<any>;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
};
type WalletConnectProvider = Eip1193 & { connect(): Promise<void>; disconnect(): Promise<void>; accounts: string[]; session?: unknown };

const PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
export const hasWalletConnect = Boolean(PROJECT_ID);

let instance: Promise<WalletConnectProvider> | null = null;

export function getWalletConnect(): Promise<WalletConnectProvider> {
  instance ??= (async () => {
    const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
    const rpc = (process.env.NEXT_PUBLIC_RPC_URL ?? "").split(",")[0].trim();
    return (await EthereumProvider.init({
      projectId: PROJECT_ID!,
      chains: [97],
      optionalChains: [97],
      showQrModal: true,
      rpcMap: { 97: rpc },
      metadata: { name: "Kulaya", description: "Modal usaha, dari hasil jualan sendiri.", url: window.location.origin, icons: [`${window.location.origin}/icons/icon-192.png`] },
    })) as unknown as WalletConnectProvider;
  })();
  return instance;
}

/** Re-attach to a WalletConnect session from an earlier visit, if there is one. */
export async function restoreWalletConnect(): Promise<WalletConnectProvider | null> {
  if (!hasWalletConnect) return null;
  try { if (!Object.keys(localStorage).some((k) => k.startsWith("wc@2"))) return null; } catch { return null; }
  const p = await getWalletConnect();
  return p.session && p.accounts[0] ? p : null;
}
