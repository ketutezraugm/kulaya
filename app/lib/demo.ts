"use client";
import { createWalletClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";

const KEY = "warung_demo_key";
let memory: Hex | null = null; // used when localStorage is unavailable (private mode)

/**
 * A throwaway TESTNET wallet that lives only in this browser, so anyone can try the full gasless payment flow with no
 * wallet extension. It holds only free mock IDRX and never any real value; it is not a production feature.
 */
export function demoWallet() {
  let k: Hex | null = null;
  try { k = localStorage.getItem(KEY) as Hex | null; } catch { /* storage blocked */ }
  k ??= memory;
  if (!k) {
    k = generatePrivateKey();
    memory = k;
    try { localStorage.setItem(KEY, k); } catch { /* keep in memory */ }
  }
  const account = privateKeyToAccount(k);
  return { account, wallet: createWalletClient({ account, chain: bscTestnet, transport: http() }) };
}
