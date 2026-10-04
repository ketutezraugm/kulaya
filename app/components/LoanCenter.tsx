"use client";
import { useState } from "react";
import type { Address } from "viem";
import { RelayUnavailable, gaslessAccept } from "@/lib/gasless";
import type { Shop } from "@/lib/shop";
import { WARUNG, warungAbi, write, errText, rupiah, txLink, type useWallet } from "@/lib/web3";

type Wallet = NonNullable<ReturnType<typeof useWallet>["wallet"]>;
const MIN_LOAN_RP = 50_000n; // mirrors server/policy.ts MIN_PRINCIPAL

const Check = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => <li style={{ listStyle: "none", margin: "4px 0" }}><span className={ok ? "ok" : "warn"}>{ok ? "✓" : "○"}</span> {children}</li>;

/** Everything about borrowing in one place: eligibility, the current offer or loan, repayment progress. */
export function LoanCenter({ shop, account, wallet, onChanged, askAI }: { shop: Shop; account: Address; wallet: Wallet | null; onChanged: () => void; askAI: (text: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState("");
  const [err, setErr] = useState("");
  const l = shop.loan;
  const p = shop.params;
  const now = Date.now();
  const expiry = l ? Number(l.proposedAt + p.proposalTtl) * 1000 : 0;
  const offerLive = l?.status === "Proposed" && now <= expiry;
  const open = l?.status === "Active" || offerLive;

  async function accept() {
    if (!wallet || !l) return;
    setErr(""); setBusy(true);
    try {
      try { setTx(await gaslessAccept(wallet, account, l.id)); } catch (e) {
        if (!(e instanceof RelayUnavailable)) throw e;
        setTx(await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "acceptLoan", args: [l.id] }));
      }
      onChanged();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  const enoughPayers = shop.payers >= p.minPayers;
  const hasLimit = shop.creditLimit >= MIN_LOAN_RP * 100n;
  const eligible = enoughPayers && hasLimit && !shop.defaulted && !open;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}><b>Loan center</b>{l && <span className="chip">Loan #{String(l.id)} · {offerLive || l.status !== "Proposed" ? l.status : "Expired"}</span>}</div>

      {offerLive && l && (
        <>
          <p style={{ margin: "10px 0 4px" }}>You have an offer waiting. These terms are read from the contract.</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="stat"><small>You receive</small><strong>{rupiah(l.principal)}</strong></div>
            <div className="stat"><small>You repay</small><strong>{rupiah(l.total)}</strong></div>
            <div className="stat"><small>Fee</small><strong>{rupiah(l.total - l.principal)}</strong></div>
            <div className="stat"><small>From each sale</small><strong>{l.repayBps / 100}%</strong></div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={accept} disabled={busy || !wallet}>{busy ? "Waiting…" : `Accept ${rupiah(l.principal)}`}</button>
            <span className="sub">Valid until {new Date(expiry).toLocaleString()}. Gasless: you only sign.{!wallet && " Connect your wallet app to accept (signing in through Telegram can view, but only a wallet can confirm)."}</span>
          </div>
        </>
      )}

      {l?.status === "Active" && (
        <>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}><span>Repaid {rupiah(l.repaid)}</span><span>of {rupiah(l.total)}</span></div>
          <div className="bar"><div style={{ width: `${Number((l.repaid * 100n) / (l.total || 1n))}%` }} /></div>
          <p className="sub" style={{ margin: 0 }}>{l.repayBps / 100}% of every sale goes to the pool automatically. Remaining {rupiah(l.total - l.repaid)}. No due date, no penalties: a slow week just means slower repayment.</p>
        </>
      )}

      {l?.status === "Repaid" && <p className="ok" style={{ margin: "10px 0 0" }}>✅ Loan #{String(l.id)} repaid in full. Your tier is now {shop.tier}, so your ceiling grew.</p>}
      {l?.status === "Defaulted" && <p className="bad" style={{ margin: "10px 0 0" }}>Loan #{String(l.id)} was written off after {Number(p.lateAfter) / 86400} days without sales. New loans are not available for this shop.</p>}

      {!open && l?.status !== "Defaulted" && (
        <>
          <p style={{ margin: "10px 0 4px" }}>{eligible ? "You can request a loan now." : "Not eligible yet:"}</p>
          <ul style={{ padding: 0, margin: 0 }}>
            <Check ok={enoughPayers}>At least {p.minPayers} different customers have paid you ({shop.payers} so far)</Check>
            <Check ok={hasLimit}>A credit limit of at least {rupiah(MIN_LOAN_RP * 100n)} (yours: {rupiah(shop.creditLimit)})</Check>
            <Check ok={!shop.defaulted}>No defaulted loan</Check>
          </ul>
          <div style={{ marginTop: 10 }}><button onClick={() => askAI("Saya mau pinjam modal")} disabled={!eligible}>Ask the AI for an offer</button></div>
        </>
      )}

      {tx && <p className="ok" style={{ margin: "8px 0 0" }}>✅ Accepted. <a href={txLink(tx)}>View transaction</a></p>}
      {err && <p className="bad" style={{ margin: "8px 0 0" }}>{err}</p>}
    </div>
  );
}
