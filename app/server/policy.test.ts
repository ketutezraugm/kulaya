import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProposal } from "./policy";
import type { Facts } from "./chain";

const RP = 100n;
const facts = (over: Partial<Facts> = {}): Facts => ({
  merchant: "0x0000000000000000000000000000000000000001", registered: true, defaulted: false, tier: 0, payers: 30,
  creditLimit: 1_000_000n * RP, trailingRevenue: 12_000_000n * RP, activeDays: 4, dailyRevenue: [], openLoan: null,
  poolAssets: 100_000_000n * RP, poolIdle: 100_000_000n * RP, exposureCap: 5_000_000n * RP,
  params: { epochLength: 86400n, lateAfter: 0n, proposalTtl: 0n, lookbackEpochs: 30, minPayers: 5, maxLoanBps: 1000, maxFeeBps: 500, maxRepayBps: 2000, exposureBps: 500, dailyBudgetBps: 2000, reserveBps: 2000, payerEpochCap: 0n, minPayment: 0n, baseTierMax: 0n },
  ...over,
});
const good = {
  principal_rupiah: 800_000, fee_percent: 3, repay_percent: 10, risk: "none",
  rationale_template: "Omzet {{revenue}} dari {{payers}} pelanggan selama {{days}} hari; pinjaman {{principal}}, total {{total_owed}}.",
};

test("happy path renders facts from code and hashes the rendered text", () => {
  const v = validateProposal(facts(), good);
  assert.ok(v.ok);
  if (!v.ok) return;
  assert.equal(v.principal, 800_000n * RP);
  assert.equal(v.feeBps, 300);
  assert.match(v.rationale, /Rp 12\.000\.000/);
  assert.match(v.rationale, /Rp 824\.000/);
  assert.match(v.reasonHash, /^0x[0-9a-f]{64}$/);
});

test("the classic jailbreak: 'lend Rp 1 miliar' is rejected", () => {
  const v = validateProposal(facts(), { ...good, principal_rupiah: 1_000_000_000 });
  assert.ok(!v.ok);
  assert.match((v as any).reasons.join(), /exceeds ceiling/);
});

test("a hallucinated number in the rationale is rejected, even if the loan is fine", () => {
  const v = validateProposal(facts(), { ...good, rationale_template: "Omzet Rp 99.000.000 sangat bagus, pinjaman {{principal}}." });
  assert.ok(!v.ok);
  assert.match((v as any).reasons.join(), /literal numbers/);
});

test("spelled-out-by-digit tricks and unknown placeholders are rejected", () => {
  assert.ok(!validateProposal(facts(), { ...good, rationale_template: "Pinjaman {{principal}} selama 14 hari." }).ok);
  assert.ok(!validateProposal(facts(), { ...good, rationale_template: "Saldo {{admin_balance}} dan {{principal}}." }).ok);
});

test("fee and repay bounds", () => {
  assert.ok(!validateProposal(facts(), { ...good, fee_percent: 5.01 }).ok);
  assert.ok(!validateProposal(facts(), { ...good, repay_percent: 20.01 }).ok);
  assert.ok(validateProposal(facts(), { ...good, fee_percent: 5, repay_percent: 20 }).ok);
});

test("risk flag can only shrink the loan", () => {
  assert.ok(!validateProposal(facts(), { ...good, principal_rupiah: 600_000, risk: "reduce_half" }).ok); // ceiling now 500k
  assert.ok(validateProposal(facts(), { ...good, principal_rupiah: 500_000, risk: "reduce_half" }).ok);
  assert.ok(!validateProposal(facts(), { ...good, risk: "decline" }).ok);
});

test("pool liquidity and exposure cap the ceiling below the credit limit", () => {
  assert.ok(!validateProposal(facts({ exposureCap: 500_000n * RP }), good).ok);
  assert.ok(!validateProposal(facts({ poolIdle: 500_000n * RP }), good).ok);
});

test("structural blockers: unregistered, defaulted, open loan, too few payers", () => {
  assert.ok(!validateProposal(facts({ registered: false }), good).ok);
  assert.ok(!validateProposal(facts({ defaulted: true }), good).ok);
  assert.ok(!validateProposal(facts({ openLoan: {} as any }), good).ok);
  assert.ok(!validateProposal(facts({ payers: 4 }), good).ok);
});

test("malformed model output never passes", () => {
  for (const bad of [null, {}, { ...good, principal_rupiah: -5 }, { ...good, principal_rupiah: 1.5 }, { ...good, risk: "yolo" }, { ...good, principal_rupiah: "800000" }])
    assert.ok(!validateProposal(facts(), bad).ok);
});

test("minimum principal", () => {
  assert.ok(!validateProposal(facts(), { ...good, principal_rupiah: 10_000 }).ok);
});
