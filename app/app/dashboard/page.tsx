"use client";
import { useEffect, useMemo, useState } from "react";
import { Chat } from "@/components/Chat";
import { LoanCenter } from "@/components/LoanCenter";
import { QrCard } from "@/components/QrCard";
import { RelayUnavailable, gaslessRegister } from "@/lib/gasless";
import { dayLabel, sumUnits, useShop } from "@/lib/shop";
import { WARUNG, warungAbi, errText, rupiah, short, txLink, useWallet, write } from "@/lib/web3";
import { TG_URL } from "@/lib/brand";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MERCHANT;

export default function Dashboard() {
  const { account, wallet, connect, error } = useWallet();
  const { shop, error: loadErr, reload } = useShop(account);
  const [inject, setInject] = useState({ n: 0, text: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 5000); return () => clearInterval(t); }, []);

  const askAI = (text: string) => { setInject((x) => ({ n: x.n + 1, text })); document.getElementById("assistant")?.scrollIntoView({ behavior: "smooth" }); };

  async function register() {
    if (!wallet || !account) return;
    setErr(""); setBusy(true);
    try {
      try { await gaslessRegister(wallet, account); } catch (e) {
        if (!(e instanceof RelayUnavailable)) throw e;
        await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "register" });
      }
      await reload();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  const stats = useMemo(() => {
    if (!shop) return null;
    const { days, params: p } = shop;
    const max = days.reduce((a, d) => (d.v > a ? d.v : a), 1n);
    const byRevenue = (shop.trailing * BigInt(p.maxLoanBps)) / 10_000n;
    const tierCeiling = p.baseTierMax << BigInt(shop.tier);
    const nextCeiling = shop.tier < 3 ? p.baseTierMax << BigInt(shop.tier + 1) : null;
    const byPayer = new Map<string, { total: bigint; n: number }>();
    for (const s of shop.sales) { const e = byPayer.get(s.payer) ?? { total: 0n, n: 0 }; e.total += BigInt(s.amount); e.n++; byPayer.set(s.payer, e); }
    const top = [...byPayer.entries()].sort((a, b) => (b[1].total > a[1].total ? 1 : -1)).slice(0, 5);
    return { max, today: days[29].v, week: sumUnits(days.slice(-7)), byRevenue, tierCeiling, nextCeiling, top };
  }, [shop]);

  if (!account) {
    return (
      <>
        <h1>Your shop dashboard</h1>
        <p className="sub">Sales, customers, your credit limit, loans and an AI assistant, all in one place. Everything is read live from BNB Chain and belongs to you.</p>
        <div className="card">
          <button onClick={connect}>Connect your shop wallet</button>
          {error && <p className="bad">{error}</p>}
          <p className="sub" style={{ margin: "10px 0 0" }}>New here? Register your shop for free after connecting: it's gasless. You can also use the <a href={TG_URL}>Telegram bot</a> with the same wallet.</p>
        </div>
        {DEMO && <p className="sub">Just looking? <a href={`/m/${DEMO}`}>See a live demo shop</a>.</p>}
      </>
    );
  }

  const header = (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <h1 style={{ marginBottom: 2 }}>Your shop</h1>
        <p className="sub" style={{ margin: 0 }}><span className="mono">{short(account)}</span>{shop?.registered && <> · <span className="chip">Tier {shop.tier}</span></>} · <a href={`/m/${account}`}>Public page</a></p>
      </div>
      <span className="sub" style={{ fontSize: 13 }}>{shop ? `Updated ${Math.max(0, Math.round((Date.now() - shop.updatedAt) / 1000))}s ago` : "Loading…"}</span>
    </div>
  );

  if (!shop) return <>{header}{loadErr ? <p className="bad">{loadErr}</p> : <p className="sub">Reading your shop from the chain…</p>}</>;

  if (!shop.registered) {
    return (
      <>
        {header}
        <div className="card">
          <b>Register your shop</b>
          <p className="sub" style={{ margin: "6px 0 12px" }}>One free signature creates your shop on-chain. After that, every payment you receive builds your verified sales history.</p>
          <button onClick={register} disabled={busy || !wallet}>{busy ? "Registering…" : "Register my shop (no gas)"}</button>
          {(err || error) && <p className="bad">{err || error}</p>}
        </div>
      </>
    );
  }

  const s = stats!;
  const p = shop.params;
  const days = shop.days;
  const salesShown = showAll ? shop.sales : shop.sales.slice(0, 8);

  return (
    <>
      {header}

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="stat"><small>Sales today (verified)</small><strong>{rupiah(s.today)}</strong></div>
        <div className="stat"><small>Last 7 days</small><strong>{rupiah(s.week)}</strong></div>
        <div className="stat"><small>Last 30 days</small><strong>{rupiah(shop.trailing)}</strong></div>
        <div className="stat"><small>Customers</small><strong>{shop.payers}</strong></div>
        <div className="stat"><small>Credit limit now</small><strong>{rupiah(shop.creditLimit)}</strong></div>
        <div className="stat"><small>Cash in your wallet</small><strong>{rupiah(shop.balance)}</strong></div>
      </div>

      <div className="cols">
        <div>
          <h2>Daily sales</h2>
          <div className="card">
            <div className="bars">{days.map((d) => <div key={String(d.epoch)} title={`${dayLabel(d.epoch, p.epochLength)}: ${rupiah(d.v)}`} style={{ height: `${Math.max(2, Number((d.v * 100n) / s.max))}%` }} />)}</div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}><span className="sub" style={{ fontSize: 12 }}>{dayLabel(days[0].epoch, p.epochLength)}</span><span className="sub" style={{ fontSize: 12 }}>{dayLabel(days[29].epoch, p.epochLength)}</span></div>
            <p className="sub" style={{ margin: "8px 0 0", fontSize: 13 }}>Verified sales count at most {rupiah(p.payerEpochCap)} per customer per day, so one wallet can't fake a history.</p>
          </div>

          <h2>Recent payments</h2>
          <div className="card" style={{ overflowX: "auto" }}>
            {shop.sales.length === 0 ? <p className="sub" style={{ margin: 0 }}>No payments yet. Show your QR to a customer, or ask the assistant for one.</p> : (
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>To loan</th><th>Customer</th><th>Note</th><th /></tr></thead>
                <tbody>
                  {salesShown.map((x) => (
                    <tr key={x.tx}>
                      <td>{dayLabel(BigInt(x.epoch), p.epochLength)}</td><td>{rupiah(BigInt(x.amount))}</td>
                      <td>{BigInt(x.repaidCut) > 0n ? <span className="chip">{rupiah(BigInt(x.repaidCut))}</span> : "—"}</td>
                      <td className="mono">{short(x.payer)}</td><td>{x.memo || "—"}</td><td><a href={txLink(x.tx)} target="_blank" rel="noreferrer">tx</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {shop.sales.length > 8 && <button className="ghost" style={{ marginTop: 8 }} onClick={() => setShowAll((v) => !v)}>{showAll ? "Show less" : `Show all ${shop.sales.length}`}</button>}
          </div>

          {s.top.length > 0 && (
            <>
              <h2>Top customers</h2>
              <div className="card">
                <table><tbody>{s.top.map(([a, v]) => <tr key={a}><td className="mono">{short(a)}</td><td>{rupiah(v.total)}</td><td className="sub">{v.n} payment{v.n > 1 ? "s" : ""}</td></tr>)}</tbody></table>
              </div>
            </>
          )}
        </div>

        <div>
          <h2>Borrow</h2>
          <LoanCenter shop={shop} account={account} wallet={wallet} onChanged={reload} askAI={askAI} />
          <QrCard address={account} minPayment={p.minPayment} />
        </div>
      </div>

      <h2>How your credit limit works</h2>
      <div className="card">
        <table><tbody>
          <tr><td>{p.maxLoanBps / 100}% of your verified sales over {p.lookbackEpochs} days ({rupiah(shop.trailing)})</td><td><b>{rupiah(s.byRevenue)}</b></td></tr>
          <tr><td>Your tier {shop.tier} ceiling</td><td><b>{rupiah(s.tierCeiling)}</b></td></tr>
          <tr><td>Your limit is the smaller of the two</td><td><b>{rupiah(shop.creditLimit)}</b></td></tr>
        </tbody></table>
        <p className="sub" style={{ margin: "8px 0 0" }}>
          {s.nextCeiling !== null ? <>Repay a loan in full to reach tier {shop.tier + 1}, which raises your ceiling to {rupiah(s.nextCeiling)}. </> : <>You're at the top tier. </>}
          The AI proposes terms inside this limit, and the smart contract refuses anything above it.
        </p>
      </div>

      <h2 id="assistant">Assistant</h2>
      <Chat account={account} wallet={wallet} inject={inject} onActivity={reload} />

      <p className="sub" style={{ marginTop: 20 }}>Prefer chat on your phone? Use the same wallet in the <a href={TG_URL}>Telegram bot</a>. <a href={`/m/${account}`}>Share your public page</a> to show customers and lenders your verified track record.</p>
    </>
  );
}
