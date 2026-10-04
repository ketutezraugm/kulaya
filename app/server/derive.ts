import type { LoanStatus } from "./abi";

/** Pure helpers shared by the API and tests (no chain access). */

/** The contract only knows Proposed/Active/Repaid/Defaulted. A proposal past its TTL is effectively "Expired". */
export type DerivedStatus = LoanStatus | "Expired";
export function derivedStatus(status: LoanStatus, proposedAt: bigint, proposalTtl: bigint, nowSec: number): DerivedStatus {
  return status === "Proposed" && BigInt(nowSec) > proposedAt + proposalTtl ? "Expired" : status;
}

const MAX_TRACKED_PAYERS = 10_000;

/** Remember payers in first-seen order, so every customer gets a stable friendly number ("Pelanggan #12"). */
export function recordPayer(order: string[], payer: string): void {
  const p = payer.toLowerCase();
  if (order.length < MAX_TRACKED_PAYERS && !order.includes(p)) order.push(p);
}

/** 1-based friendly number of a customer within one shop; 0 when unknown. */
export function customerNumber(order: string[] | undefined, payer: string): number {
  const i = order ? order.indexOf(payer.toLowerCase()) : -1;
  return i + 1;
}
