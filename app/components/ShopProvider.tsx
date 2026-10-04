"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { loadSession, type Session } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useWallet } from "@/lib/web3";

type Ctx = ReturnType<typeof useWallet> & ReturnType<typeof useShop> & { viewer: Address | null; session: Session | null; ready: boolean };
const C = createContext<Ctx | null>(null);

/** One wallet + one shop reading for every owner screen. The viewer is the connected wallet, else the Telegram-login session address. */
export function ShopProvider({ children }: { children: ReactNode }) {
  const w = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  useEffect(() => { setSession(loadSession()); setSessionLoaded(true); }, []);
  const viewer: Address | null = w.account ?? session?.address ?? null;
  const s = useShop(viewer);
  return <C.Provider value={{ ...w, ...s, viewer, session, ready: w.ready && sessionLoaded }}>{children}</C.Provider>;
}

export function useOwner() {
  const c = useContext(C);
  if (!c) throw new Error("useOwner outside ShopProvider");
  return c;
}
