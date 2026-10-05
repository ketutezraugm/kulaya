"use client";
import { Art, Icon } from "@/components/ui";
import * as dev from "@/components/art/dev";
import * as stall from "@/components/art/stall";
import { ApiError, PHead, PLink, REPO, Sec, Stat, jt, useAgent } from "@/components/proto";
import { EXPLORER, WARUNG } from "@/lib/web3";

const TRACKS = [
  { art: dev.badgeTrackAiAgents, title: "AI Agents", body: "An LLM underwriter with an ERC-8004 identity and on-chain reputation, boxed in by code it cannot override." },
  { art: dev.badgeTrackFinance, title: "Finance & Commerce", body: "Revenue-based micro-credit: limit = 10% of verified 30-day sales, repaid as a share of each sale." },
  { art: dev.badgeTrackConsumer, title: "Consumer Apps", body: "A Bahasa-first, gasless owner app and Telegram bot built for warung owners aged 35-60." },
];
const SHIELDS = [
  ["The AI key can only propose", "It holds no funds and has no role that moves value. Accepting requires the owner's own signature."],
  ["Hard on-chain caps", "10% of trailing revenue · tier max · fee ≤ 5% · repay ≤ 20% · ≤ 5% of pool per loan · daily budget · ≥ 5 distinct payers · per-payer daily cap Rp 250.000."],
  ["Policy layer: the LLM never writes numbers", "Replies use {{placeholders}} that code fills from contract reads."],
  ["Reply guard", "Every figure in a reply must exist in a tool result, or the reply is rejected."],
];

export default function Overview() {
  const { data: a, error, retry } = useAgent();
  const tour: [string, string, string, string, boolean][] = [
    ["1", "Watch the demo", "Video link is added at submission.", "#", false],
    ["2", "Try the owner app", "Bahasa, phone-first. Test money only.", "/", true],
    ["3", "Try to break the AI", "Red-team console, simulation only.", "/protocol/redteam", false],
    ["4", "Read the contracts", "Addresses, parameters, tests, BscScan.", "/protocol/contracts", false],
  ];
  return (
    <>
      <PHead route="/protocol" title="Kulaya Protocol" art={stall.illStallBerkembang} artW={170}
        lead={<>Kulaya turns QR sales into an on-chain revenue record that unlocks collateral-free micro-loans for Indonesian small shops, repaid automatically as a share of each sale.<br /><b>The AI proposes. The contract decides.</b></>} />

      <div className="p-grid w3">
        {TRACKS.map((t) => (
          <div className="p-card" key={t.title} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Art svg={t.art} w={64} /><div><h3>{t.title}</h3><p className="small">{t.body}</p></div>
          </div>
        ))}
      </div>

      <Sec n="01" title="The 60-second tour">
        <div className="p-grid">
          {tour.map(([n, t, d, href, hi]) => {
            const inner = <><span style={{ font: "400 22px var(--k-font-display)" }}>{n}</span><b style={{ fontSize: 17 }}>{t}</b><span className="small" style={hi ? { color: "var(--k-color-nila-900)" } : undefined}>{d}</span></>;
            const style = { textDecoration: "none", color: "inherit", border: "2px solid var(--k-color-ink)", background: hi ? "var(--k-color-accent)" : "var(--k-color-surface)", boxShadow: hi ? "var(--k-shadow-stamp)" : undefined } as const;
            return href === "#" ? <div key={n} className="p-card" style={style} aria-disabled="true">{inner}</div> : <a key={n} className="p-card" style={style} href={href}>{inner}</a>;
          })}
        </div>
      </Sec>

      <Sec n="02" title="Live numbers">
        {error && !a ? <ApiError code={error} retry={retry} /> : (
          <div className="p-grid" data-testid="live-numbers">
            <Stat label="Pool value" value={a ? jt(a.pool.assets) : "…"} sub="IDRX (test)" />
            <Stat label="Out on loan" value={a ? jt(a.pool.loanedOut) : "…"} sub={a ? `${a.stats.loansActive} active` : undefined} />
            <Stat label="First-loss reserve" value={a ? jt(a.pool.reserve) : "…"} sub="20% of fees" />
            <Stat label="Loans closed" value={a ? a.stats.loansRepaid : "…"} sub={a ? `${a.stats.loansProposed} proposed · ${a.stats.loansDefaulted} written off` : undefined} />
            <Stat label="AI score" value={a ? (a.reputation?.count ? `${a.reputation.average}/100` : "n/a yet") : "…"} sub={a?.reputation ? `ERC-8004 · ${a.reputation.count} loans` : "ERC-8004 avg"} />
            <Stat label="Shops" value={a ? a.stats.shops : "…"} sub="registered" />
          </div>
        )}
      </Sec>

      <Sec n="03" title="Architecture">
        <div className="p-card p-art" style={{ padding: 12 }}><Art svg={dev.diaArchitecture} /></div>
        <div className="p-grid w3 small">
          <p><b>1-2.</b> Each payFor writes a revenue record and splits the payment. The cap is computed on-chain from trailing 30-day revenue.</p>
          <p><b>3-4.</b> The AI wallet can only call propose_loan. The owner accepts with an EIP-712 signature, which the relayer submits gaslessly.</p>
          <p><b>5-6.</b> Every later sale auto-repays its share. When the loan closes, the keeper reports the outcome to the ERC-8004 Reputation Registry.</p>
        </div>
      </Sec>

      <Sec n="04" title="Security model: four shields">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,320px) minmax(0,1fr)", gap: 24 }} className="p-split">
          <div className="p-card key" style={{ alignItems: "center", background: "var(--k-color-accent-soft)" }}><Art svg={dev.diaShields} /><p className="small" style={{ textAlign: "center" }}>Attacks bounce off each layer. The contract is the last word.</p></div>
          <ol style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SHIELDS.map(([t, d], i) => (
              <li key={t} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1.5px dashed var(--k-color-border-strong)" }}>
                <span style={{ flex: "none", width: 28, height: 28, borderRadius: 14, background: "var(--k-color-nila-900)", color: "var(--k-color-kunyit-500)", display: "flex", alignItems: "center", justifyContent: "center", font: "400 16px var(--k-font-display)" }}>{i + 1}</span>
                <div><b>{t}</b><p className="small">{d}</p></div>
              </li>
            ))}
            <li className="small" style={{ padding: "12px 0" }}><b>PLUS</b> · Consent terms are read from the chain, and the merchant is fixed by code, so no tool lets the model retarget a loan.</li>
          </ol>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <PLink href="/protocol/redteam" kind="accent"><Icon name="peringatan" size={18} />Try to break it</PLink>
          <PLink href="/protocol/contracts"><Icon name="kode" size={18} />Read the caps in Warung.sol</PLink>
        </div>
      </Sec>

      <div className="p-grid w3">
        <div className="p-card warm" data-testid="honest-limits">
          <h3>Honest limits</h3>
          {["Testnet only. \"Rupiah digital\" is a mock IDRX stablecoin.", "The QR is not QRIS: OVO, GoPay and bank apps cannot scan it yet.", "No real pilot users yet.", "A real launch needs a licensed lender of record."].map((x) => <p key={x} style={{ display: "flex", gap: 8, fontSize: 15 }}><Icon name="peringatan" size={20} />{x}</p>)}
        </div>
        <div className="p-card">
          <h3>Roadmap</h3>
          {["QRIS bridge via IDRX and a licensed PSP", "OJK sandbox, or a licensed P2P lender / koperasi partner", "Mainnet deployment", "Embedded wallets", "MegaFuel paymaster"].map((x) => <p key={x} style={{ display: "flex", gap: 8, fontSize: 15 }}><Icon name="lanjut" size={20} />{x}</p>)}
        </div>
      </div>

      <Sec n="05" title="Team & links">
        <div className="p-card" style={{ gap: 8 }}>
          {[["kode", "github.com/ketutezraugm/kulaya", REPO], ["beranda", "kulaya.vercel.app", "/"], ["telegram", "t.me/KulayaBot", "https://t.me/KulayaBot"], ["verifikasi", "Warung.sol on BscScan", `${EXPLORER}/address/${WARUNG}`]].map(([i, l, h]) => (
            <a key={l} href={h} target={h.startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={{ display: "flex", gap: 10, alignItems: "center" }}><Icon name={i as never} size={20} />{l}</a>
          ))}
          <p className="small">Built for Indonesia Web3 Hackathon 2026 · BNB Chain, Binance Academy, Coinvestasi, Dev Web3 Jogja.</p>
        </div>
      </Sec>
    </>
  );
}
