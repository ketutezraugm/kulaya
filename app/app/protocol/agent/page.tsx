"use client";
import { useEffect, useState } from "react";
import { AGENT_ID, ADAPTER, BOT_API, IDENTITY, REPUTATION, EXPLORER, publicClient, identityAbi, rupiah, short } from "@/lib/web3";

export default function Agent() {
  const [a, setA] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [owner, setOwner] = useState("");
  useEffect(() => {
    fetch(`${BOT_API}/agent`).then((r) => r.json()).then(setA).catch(() => {});
    (async () => {
      setOwner(await publicClient.readContract({ address: IDENTITY, abi: identityAbi, functionName: "ownerOf", args: [AGENT_ID] }));
      const uri = await publicClient.readContract({ address: IDENTITY, abi: identityAbi, functionName: "tokenURI", args: [AGENT_ID] });
      if (uri.startsWith("data:application/json;base64,")) setCard(JSON.parse(atob(uri.split(",")[1])));
    })().catch(() => {});
  }, []);

  const rep = a?.reputation;
  return (
    <>
      <h1>The underwriter AI has an on-chain identity and a public track record</h1>
      <p className="sub">Registered as an ERC-8004 agent. Every loan that closes writes its outcome to the Reputation Registry, and the AI cannot write its own reviews (the registry rejects self-feedback).</p>
      <div className="grid">
        <div className="stat"><small>Agent ID (ERC-8004)</small><strong>#{String(AGENT_ID)}</strong></div>
        <div className="stat"><small>Loans closed</small><strong>{rep ? rep.count : "…"}</strong></div>
        <div className="stat"><small>Repayment score</small><strong>{rep ? (rep.count ? `${rep.average}/100` : "n/a yet") : "…"}</strong></div>
      </div>

      <h2>What it is allowed to do</h2>
      <div className="card">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Its key can call <b>one</b> function: <span className="mono">proposeLoan</span>. It holds no funds and cannot move money.</li>
          <li>It can never exceed what the contract computes from verified sales. Anything larger reverts on-chain.</li>
          <li>The owner must accept in their own wallet, reading the terms from the contract.</li>
        </ul>
        {a && (
          <table style={{ marginTop: 12 }}><tbody>
            <tr><td>Max loan</td><td>{a.caps.maxLoanBps / 100}% of trailing revenue (first loan ≤ {rupiah(a.caps.baseTierMax)})</td></tr>
            <tr><td>Max flat fee</td><td>{a.caps.maxFeeBps / 100}%</td></tr>
            <tr><td>Max share of each sale</td><td>{a.caps.maxRepayBps / 100}%</td></tr>
            <tr><td>Per-loan pool exposure</td><td>{a.caps.exposureBps / 100}% of pool</td></tr>
            <tr><td>New lending per day</td><td>{a.caps.dailyBudgetBps / 100}% of pool</td></tr>
            <tr><td>Fake-sales guard</td><td>≥ {a.caps.minPayers} distinct customers; max {rupiah(a.caps.payerEpochCap)} counted per customer per day</td></tr>
          </tbody></table>
        )}
      </div>

      <h2>Registry entries</h2>
      <div className="card">
        <p className="sub" style={{ marginTop: 0 }}>Agent wallet (owner of the ERC-8004 identity): <a className="mono" href={`${EXPLORER}/address/${owner}`}>{owner && short(owner)}</a></p>
        <p className="sub">Identity Registry <a className="mono" href={`${EXPLORER}/address/${IDENTITY}`}>{short(IDENTITY)}</a> · Reputation Registry <a className="mono" href={`${EXPLORER}/address/${REPUTATION}`}>{short(REPUTATION)}</a> · Feedback sender (our adapter, callable only by the Warung contract) <a className="mono" href={`${EXPLORER}/address/${ADAPTER}`}>{short(ADAPTER)}</a></p>
        {card && <details><summary>Agent card (stored on-chain)</summary><pre>{JSON.stringify(card, null, 2)}</pre></details>}
      </div>
    </>
  );
}
