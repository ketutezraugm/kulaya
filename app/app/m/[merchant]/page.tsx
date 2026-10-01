"use client";
import { use, useEffect, useState } from "react";
import type { Address } from "viem";
import { BOT_API, LOAN_STATUS, warungRead, rupiah, short, txLink } from "@/lib/web3";

export default function Shop({ params }: { params: Promise<{ merchant: string }> }) {
  const merchant = use(params).merchant as Address;
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const [m, p, epoch, limit, trailing] = await Promise.all([warungRead("merchants", [merchant]), warungRead("p"), warungRead("currentEpoch"), warungRead("creditLimit", [merchant]), warungRead("trailingRevenue", [merchant])]);
      const days = await Promise.all(Array.from({ length: 30 }, (_, i) => warungRead("epochRevenue", [merchant, epoch - BigInt(29 - i)]).then((v: bigint) => ({ epoch: epoch - BigInt(29 - i), v }))));
      const loan = m[4] > 0n ? await warungRead("loans", [m[4]]) : null;
      // sale history comes from the bot's indexed cache (public RPCs cap eth_getLogs ranges); everything else is read from the chain
      const sales = await fetch(`${BOT_API}/sales?merchant=${merchant}`).then((r) => r.json()).then((j) => j.sales ?? []).catch(() => []);
      setD({ m, p, limit, trailing, days, loan, loanId: m[4], sales, epochLen: p[0] });
    })().catch((e) => setErr(e.message.split("\n")[0]));
  }, [merchant]);

  if (err) return <p className="bad">{err}</p>;
  if (!d) return <p className="sub">Loading from chain…</p>;
  if (!d.m[0]) return <p className="bad">This address isn't a registered shop.</p>;
  const max = d.days.reduce((a: bigint, x: any) => (x.v > a ? x.v : a), 1n);
  const l = d.loan;
  const status = l ? LOAN_STATUS[l[1]] : null;
  const pct = l && l[4] > 0n ? Number((l[5] * 100n) / l[4]) : 0;

  return (
    <>
      <h1>Shop <span className="mono">{short(merchant)}</span></h1>
      <p className="sub">Everything here is read live from BNB Chain. Sales history is owned by the shop, not by us.</p>
      <div className="grid">
        <div className="stat"><small>Verified revenue (last 30 days)</small><strong>{rupiah(d.trailing)}</strong></div>
        <div className="stat"><small>Credit limit now</small><strong>{rupiah(d.limit)}</strong></div>
        <div className="stat"><small>Distinct customers</small><strong>{d.m[3]}</strong></div>
        <div className="stat"><small>Tier</small><strong>{d.m[2]}</strong></div>
      </div>

      <h2>Daily verified sales</h2>
      <div className="card">
        <div className="bars">{d.days.map((x: any) => <div key={String(x.epoch)} title={`${new Date(Number(x.epoch * d.epochLen) * 1000).toISOString().slice(0, 10)}: ${rupiah(x.v)}`} style={{ height: `${Math.max(2, Number((x.v * 100n) / max))}%` }} />)}</div>
        <p className="sub" style={{ margin: "8px 0 0" }}>Each customer counts for at most {rupiah(d.p[11])} per day, so one wallet can't fake a history.</p>
      </div>

      {l && (
        <>
          <h2>Loan #{String(d.loanId)} <span className="chip">{status}</span></h2>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}><span>Repaid {rupiah(l[5])}</span><span>of {rupiah(l[4])}</span></div>
            <div className="bar"><div style={{ width: `${pct}%` }} /></div>
            <p className="sub" style={{ margin: 0 }}>{l[2] / 100}% of each sale repays the pool automatically. <a href={`/loan/${d.loanId}`}>Loan details</a></p>
          </div>
        </>
      )}

      <h2>Recent payments</h2>
      <div className="card">
        <table><tbody>
          {d.sales.length === 0 && <tr><td className="sub">No payments found.</td></tr>}
          {d.sales.map((s: any) => <tr key={s.tx}><td>{rupiah(BigInt(s.amount))}</td><td>{s.memo || "—"}</td><td className="mono">{short(s.payer)}</td><td><a href={txLink(s.tx)}>tx</a></td></tr>)}
        </tbody></table>
      </div>
    </>
  );
}
