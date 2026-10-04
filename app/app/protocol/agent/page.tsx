"use client";
import { useEffect, useState } from "react";
import { Art, Icon } from "@/components/ui";
import * as mascot from "@/components/art/mascot";
import { Addr, ApiError, Code, PHead, Sec, Stat, jt, useAgent } from "@/components/proto";
import { ADAPTER, AGENT_ID, IDENTITY, REPUTATION, identityAbi, publicClient, rupiah } from "@/lib/web3";

const CAN = ["Read a shop's on-chain revenue and cap", "Call propose_loan within caps", "Create a QR payment link", "Answer in Bahasa via web and Telegram"];
const CANNOT = ["Move or hold funds", "Accept a loan for the owner", "Change caps, tiers or fee limits", "Write numbers into replies (code fills them)"];
const CHAIN = ["Groq", "Cerebras", "Mistral", "OpenRouter", "Gemini"];

export default function Agent() {
  const { data: a, error, retry } = useAgent();
  const [card, setCard] = useState<unknown>(null);
  const [owner, setOwner] = useState("");
  useEffect(() => {
    (async () => {
      setOwner(await publicClient.readContract({ address: IDENTITY, abi: identityAbi, functionName: "ownerOf", args: [AGENT_ID] }));
      const uri = await publicClient.readContract({ address: IDENTITY, abi: identityAbi, functionName: "tokenURI", args: [AGENT_ID] });
      if (uri.startsWith("data:application/json;base64,")) setCard(JSON.parse(atob(uri.split(",")[1])));
    })().catch(() => {});
  }, []);
  const rep = a?.reputation;
  const c = a?.caps;
  return (
    <>
      <PHead route="/protocol/agent" title="AI agent identity" art={mascot.mascotThink} artW={120}
        lead="The underwriter is a registered ERC-8004 agent. Its identity and repayment reputation are public; its powers are deliberately small." />

      {error && !a ? <ApiError code={error} retry={retry} /> : (
        <div className="p-grid">
          <Stat label="Agent ID" value={`#${AGENT_ID}`} sub="ERC-8004 Identity" />
          <Stat label="Feedback count" value={rep ? rep.count : "…"} sub="loan outcomes on-chain" />
          <Stat label="Average score" value={rep ? (rep.count ? `${rep.average}/100` : "n/a yet") : "…"} sub="written by the contract, not by the AI" />
          <Stat label="Loans proposed" value={a ? a.stats.loansProposed : "…"} />
        </div>
      )}

      <Sec title="Addresses">
        <table className="p-table"><thead><tr><th>Role</th><th>Address</th></tr></thead><tbody>
          <tr><td>AI wallet (owns the identity)</td><td>{owner && <Addr a={owner} />}</td></tr>
          <tr><td>Identity Registry</td><td><Addr a={IDENTITY} /></td></tr>
          <tr><td>Reputation Registry</td><td><Addr a={REPUTATION} /></td></tr>
          <tr><td>ReputationAdapter</td><td><Addr a={ADAPTER} /></td></tr>
        </tbody></table>
      </Sec>

      <Sec title="Powers vs limits">
        <div className="p-grid w3">
          <div className="p-card"><h3 style={{ display: "flex", gap: 8 }}><Icon name="lunas" size={22} />Can</h3>{CAN.map((x) => <p key={x} style={{ fontSize: 15 }}>{x}</p>)}</div>
          <div className="p-card"><h3 style={{ display: "flex", gap: 8 }}><Icon name="gagal" size={22} />Cannot</h3>{CANNOT.map((x) => <p key={x} style={{ fontSize: 15 }}>{x}</p>)}</div>
        </div>
        {c && (
          <table className="p-table"><thead><tr><th>Cap enforced by the contract</th><th>Value</th></tr></thead><tbody>
            <tr><td>Max loan</td><td>{Number(c.maxLoanBps) / 100}% of trailing revenue (first loan ≤ {rupiah(BigInt(c.baseTierMax))})</td></tr>
            <tr><td>Max flat fee</td><td>{Number(c.maxFeeBps) / 100}%</td></tr>
            <tr><td>Max share of each sale</td><td>{Number(c.maxRepayBps) / 100}%</td></tr>
            <tr><td>Per-loan pool exposure</td><td>{Number(c.exposureBps) / 100}% of pool</td></tr>
            <tr><td>New lending per day</td><td>{Number(c.dailyBudgetBps) / 100}% of pool</td></tr>
            <tr><td>Fake-sales guard</td><td>≥ {c.minPayers} distinct customers; max {rupiah(BigInt(c.payerEpochCap))} counted per customer per day</td></tr>
          </tbody></table>
        )}
      </Sec>

      <Sec title="Agent card">
        <p className="small">Read from the Identity Registry's tokenURI, stored fully on-chain.</p>
        {card ? <Code title="agent card (tokenURI)" text={JSON.stringify(card, null, 2)} /> : <div className="p-card"><p className="small">Reading tokenURI from the chain…</p></div>}
      </Sec>

      <Sec title="LLM provider chain">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {CHAIN.map((p, i) => (
            <span key={p} style={{ display: "contents" }}>
              <span className="p-card" style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: "10px 14px" }}><b style={{ font: "400 16px var(--k-font-display)", color: "var(--k-color-heading)" }}>{i + 1}</b>{p}</span>
              {i < CHAIN.length - 1 && <Icon name="lanjut" size={18} />}
            </span>
          ))}
        </div>
        <p className="small">Failover runs left to right. Swapping the model does not change the guarantees: the caps live in the contract and the numbers come from code.</p>
      </Sec>
    </>
  );
}
