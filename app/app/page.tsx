"use client";
import { useEffect, useState } from "react";
import { BOT_API, rupiah, short, WARUNG, IDRX, EXPLORER } from "@/lib/web3";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MERCHANT;
const ghost = { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" };

export default function Home() {
  const [agent, setAgent] = useState<any>(null);
  useEffect(() => { fetch(`${BOT_API}/agent`).then((r) => r.json()).then(setAgent).catch(() => {}); }, []);
  return (
    <>
      <h1>Fair credit for 64 million small shops. The AI proposes, the contract decides.</h1>
      <p className="sub">
        Warung owners chat with an AI in Bahasa. Customers pay by QR in an IDR stablecoin, so every sale becomes a tamper-proof revenue record.
        That record unlocks collateral-free micro-loans from a public pool, repaid automatically as a small share of each sale. No pinjol, no debt collectors.
      </p>
      <div className="row">
        <a className="btn" href="/dashboard">Open my shop dashboard</a>
        {DEMO && <a className="btn" style={ghost} href={`/m/${DEMO}`}>See a live shop</a>}
        <a className="btn" style={ghost} href="/redteam">Try to break the AI</a>
        <a className="btn" style={ghost} href="https://t.me/WarungAgenttBot">Open the Telegram bot</a>
      </div>

      <h2>How a loan works</h2>
      <div className="grid">
        {[
          ["1. Sell", "Customers scan a QR and pay in IDRX. Each payment is recorded on-chain."],
          ["2. Get an offer", "The AI reads the verified sales and proposes terms, never above the limit the contract computed (10% of recent revenue)."],
          ["3. Accept", "The owner accepts in their own wallet, reading terms straight from the contract."],
          ["4. Repay by selling", "Each sale automatically sends a small share to the pool. A slow week just means slower repayment."],
        ].map(([t, d]) => <div className="card" key={t}><b>{t}</b><br /><span className="sub">{d}</span></div>)}
      </div>

      <h2>Why the AI can't hurt anyone</h2>
      <div className="card">
        <p style={{ margin: 0 }}>
          LLMs hallucinate and get jailbroken, so nothing the AI says is trusted. Its key can only <i>propose</i> loans and holds no funds. Code, not the AI, supplies every number it quotes.
          The contract enforces the loan cap, fee cap, repayment cap, pool exposure and a daily budget. <a href="/redteam">Attack it yourself</a> and watch each layer block you.
        </p>
      </div>

      <h2>Live on BNB Smart Chain testnet</h2>
      <div className="grid">
        <div className="stat"><small>Lending pool</small><strong>{agent ? rupiah(BigInt(agent.pool.assets)) : "…"}</strong></div>
        <div className="stat"><small>Out on loan</small><strong>{agent ? rupiah(BigInt(agent.pool.loanedOut)) : "…"}</strong></div>
        <div className="stat"><small>AI repayment record</small><strong>{agent?.reputation ? (agent.reputation.count ? `${agent.reputation.average}/100 · ${agent.reputation.count} loans` : "no loans closed yet") : "…"}</strong></div>
      </div>
      <p className="sub" style={{ marginTop: 16 }}>
        Warung contract <a href={`${EXPLORER}/address/${WARUNG}`} className="mono">{WARUNG && short(WARUNG)}</a> · IDRX (mock) <a href={`${EXPLORER}/address/${IDRX}`} className="mono">{IDRX && short(IDRX)}</a> · testnet only, no real money.
      </p>
    </>
  );
}
