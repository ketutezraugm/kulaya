"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { getToken } from "./auth";
import { BOT_API, IDRX, LOAN_STATUS, WARUNG, erc20Abi, publicClient, warungAbi } from "./web3";

export type SaleRow = { payer: Address; amount: string; repaidCut: string; memo: string; epoch: string; tx: string; customerNo: number };
/** One loan of the shop, as returned by /api/loans (bigints arrive as strings). `derived` adds "Expired" for stale offers. */
export type LoanRowView = { id: string; derived: string; status: string; principal: string; total: string; fee: string; repaid: string; repayBps: number; proposedAt: string; acceptedAt: string };
export type ShopProfile = { name: string | null; nickname?: string | null };
export type Params = {
  epochLength: bigint; lateAfter: bigint; proposalTtl: bigint; lookbackEpochs: number; minPayers: number; maxLoanBps: number; maxFeeBps: number;
  maxRepayBps: number; exposureBps: number; dailyBudgetBps: number; reserveBps: number; payerEpochCap: bigint; minPayment: bigint; baseTierMax: bigint;
};
export type LoanView = {
  id: bigint; merchant: Address; status: (typeof LOAN_STATUS)[number]; repayBps: number; principal: bigint; total: bigint; repaid: bigint;
  proposedAt: bigint; acceptedAt: bigint; lastSaleAt: bigint; reasonHash: string;
};
export type Shop = {
  registered: boolean; defaulted: boolean; tier: number; payers: number; creditLimit: bigint; trailing: bigint; epoch: bigint; params: Params;
  days: { epoch: bigint; v: bigint }[]; loan: LoanView | null; balance: bigint; poolIdle: bigint; sales: SaleRow[]; loans: LoanRowView[]; profile: ShopProfile; updatedAt: number;
};

const PARAM_KEYS = ["epochLength", "lateAfter", "proposalTtl", "lookbackEpochs", "minPayers", "maxLoanBps", "maxFeeBps", "maxRepayBps", "exposureBps", "dailyBudgetBps", "reserveBps", "payerEpochCap", "minPayment", "baseTierMax"];
const W = { address: WARUNG, abi: warungAbi } as const;

/** Everything the owner dashboard needs, in two batched RPC calls plus one cached API call. Refreshes on an interval. */
export function useShop(address: Address | null, everyMs = 20_000) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!address || busy.current) return;
    busy.current = true;
    try {
      const [m, p, epoch, creditLimit, trailing, balance, poolIdle] = (await publicClient.multicall({
        allowFailure: false,
        contracts: [
          { ...W, functionName: "merchants", args: [address] }, { ...W, functionName: "p" }, { ...W, functionName: "currentEpoch" },
          { ...W, functionName: "creditLimit", args: [address] }, { ...W, functionName: "trailingRevenue", args: [address] },
          { address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [address] }, { ...W, functionName: "idle" },
        ] as any,
      })) as any[];
      const params = Object.fromEntries(PARAM_KEYS.map((k, i) => [k, p[i]])) as Params;
      const epochs = Array.from({ length: 30 }, (_, i) => epoch - BigInt(29 - i));
      const loanId: bigint = m[4];
      const second = (await publicClient.multicall({
        allowFailure: false,
        contracts: [...epochs.map((e) => ({ ...W, functionName: "epochRevenue", args: [address, e] })), ...(loanId > 0n ? [{ ...W, functionName: "loans", args: [loanId] }] : [])] as any,
      })) as any[];
      const days = epochs.map((e, i) => ({ epoch: e, v: second[i] as bigint }));
      const l = loanId > 0n ? second[30] : null;
      const loan: LoanView | null = l ? { id: loanId, merchant: l[0], status: LOAN_STATUS[l[1]], repayBps: l[2], principal: l[3], total: l[4], repaid: l[5], proposedAt: l[6], acceptedAt: l[7], lastSaleAt: l[8], reasonHash: l[9] } : null;
      const sales: SaleRow[] = await fetch(`${BOT_API}/sales?merchant=${address}&limit=100`).then((r) => r.json()).then((j) => j.sales ?? []).catch(() => []);
      const loans: LoanRowView[] = await fetch(`${BOT_API}/loans?merchant=${address}`).then((r) => r.json()).then((j) => j.loans ?? []).catch(() => []);
      const token = getToken(address); // with the owner's own session the private nickname comes back too
      const profile: ShopProfile = await fetch(`${BOT_API}/profile?merchant=${address}`, token ? { headers: { authorization: `Bearer ${token}` } } : undefined).then((r) => r.json()).catch(() => ({ name: null }));
      setShop({ registered: m[0], defaulted: m[1], tier: m[2], payers: m[3], creditLimit, trailing, epoch, params, days, loan, balance, poolIdle, sales, loans, profile, updatedAt: Date.now() });
      setError("");
    } catch (e) { setError((e as Error).message.split("\n")[0].slice(0, 160)); } finally { busy.current = false; }
  }, [address]);

  useEffect(() => {
    setShop(null);
    load();
    if (!address) return;
    const t = setInterval(load, everyMs);
    return () => clearInterval(t);
  }, [address, load, everyMs]);

  return { shop, error, reload: load };
}

/** Helpers shared by dashboard widgets. */
export const dayLabel = (epoch: bigint, epochLength: bigint) => new Date(Number(epoch * epochLength) * 1000).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
export const sumUnits = (xs: { v: bigint }[]) => xs.reduce((a, b) => a + b.v, 0n);
