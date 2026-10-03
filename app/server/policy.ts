import { z } from "zod";
import type { Hex } from "viem";
import type { Facts } from "./chain";
import { reasonHash, RP } from "./chain";
import { rupiah } from "./util";

/**
 * Off-chain safety layer between the LLM and the contract. The contract re-checks everything (this is defense in
 * depth, and it gives users a friendly explanation before a revert); the two rules that matter most here:
 *  1. The LLM never writes numbers. Its rationale is a template with {{placeholders}}; code fills in real facts.
 *     Any stray digit in the template means the model is inventing figures, so the proposal is rejected.
 *  2. The LLM can only make a loan smaller or decline, never bigger than what code computed from chain state.
 */

export const PLACEHOLDERS = ["revenue", "limit", "principal", "fee", "repay", "payers", "days", "tier", "total_owed"] as const;

export const ProposalSchema = z.object({
  principal_rupiah: z.number().int().positive(),
  fee_percent: z.number().min(0).max(100),
  repay_percent: z.number().positive().max(100),
  risk: z.enum(["none", "reduce_half", "decline"]),
  rationale_template: z.string().min(10).max(800),
});
export type RawProposal = z.infer<typeof ProposalSchema>;

export type Verdict =
  | { ok: true; principal: bigint; feeBps: number; repayBps: number; rationale: string; reasonHash: Hex }
  | { ok: false; reasons: string[] };

const MIN_PRINCIPAL = 50_000n * RP;

export function renderRationale(template: string, f: Facts, p: { principal: bigint; feeBps: number; repayBps: number }): { text: string } | { error: string } {
  const used = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  const unknown = used.filter((u) => !(PLACEHOLDERS as readonly string[]).includes(u));
  if (unknown.length) return { error: `unknown placeholder(s): ${unknown.join(", ")}` };
  const stripped = template.replace(/\{\{\w+\}\}/g, "");
  if (/\d/.test(stripped)) return { error: "rationale contains literal numbers; numbers must come from {{placeholders}}" };
  const total = p.principal + (p.principal * BigInt(p.feeBps)) / 10_000n;
  const values: Record<(typeof PLACEHOLDERS)[number], string> = {
    revenue: rupiah(f.trailingRevenue), limit: rupiah(f.creditLimit), principal: rupiah(p.principal),
    fee: `${p.feeBps / 100}%`, repay: `${p.repayBps / 100}%`, payers: String(f.payers), days: String(f.activeDays),
    tier: String(f.tier), total_owed: rupiah(total),
  };
  return { text: template.replace(/\{\{(\w+)\}\}/g, (_, k: (typeof PLACEHOLDERS)[number]) => values[k]) };
}

export function validateProposal(f: Facts, raw: unknown): Verdict {
  const parsed = ProposalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reasons: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const r = parsed.data;
  const reasons: string[] = [];

  if (!f.registered) reasons.push("merchant is not registered");
  if (f.defaulted) reasons.push("merchant has a defaulted loan");
  if (f.openLoan) reasons.push("merchant already has an open loan");
  if (f.payers < f.params.minPayers) reasons.push(`only ${f.payers} distinct payers, need ${f.params.minPayers}`);
  if (r.risk === "decline") reasons.push("underwriter declined on risk grounds");

  let principal = BigInt(r.principal_rupiah) * RP;
  const feeBps = Math.round(r.fee_percent * 100);
  const repayBps = Math.round(r.repay_percent * 100);

  // risk flags can only shrink the ceiling; they can never raise it
  let ceiling = f.creditLimit;
  if (r.risk === "reduce_half") ceiling = ceiling / 2n;
  if (f.exposureCap < ceiling) ceiling = f.exposureCap;
  if (f.poolIdle < ceiling) ceiling = f.poolIdle;

  if (principal > ceiling) reasons.push(`principal ${rupiah(principal)} exceeds ceiling ${rupiah(ceiling)}`);
  if (principal < MIN_PRINCIPAL) reasons.push(`principal below minimum ${rupiah(MIN_PRINCIPAL)}`);
  if (feeBps > f.params.maxFeeBps) reasons.push(`fee ${feeBps / 100}% exceeds max ${f.params.maxFeeBps / 100}%`);
  if (repayBps < 1 || repayBps > f.params.maxRepayBps) reasons.push(`repay ${repayBps / 100}% outside 0.01%..${f.params.maxRepayBps / 100}%`);
  if (reasons.length) return { ok: false, reasons };

  const rendered = renderRationale(r.rationale_template, f, { principal, feeBps, repayBps });
  if ("error" in rendered) return { ok: false, reasons: [rendered.error] };
  return { ok: true, principal, feeBps, repayBps, rationale: rendered.text, reasonHash: reasonHash(rendered.text) };
}
