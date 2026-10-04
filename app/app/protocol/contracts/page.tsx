"use client";
import { Icon } from "@/components/ui";
import * as dev from "@/components/art/icon";
import { Addr, PHead, PLink, REPO, Sec, Tag, useAgent } from "@/components/proto";
import { ADAPTER, IDENTITY, IDRX, REPUTATION, WARUNG, rupiah } from "@/lib/web3";

const RELAYER = "0x15c3e5B24aA0E3bCf6693a7f2C20052ec60A828c"; // public address of the gasless relayer
const SRC = `${REPO}/blob/main/contracts/src`;

export default function Contracts() {
  const { data: a } = useAgent();
  const c = a?.caps;
  const rows: [string, string, string | undefined, string?][] = [
    ["Kulaya core (Warung.sol)", WARUNG, `${SRC}/Warung.sol`],
    ["MockIDRX (2 decimals)", IDRX, `${SRC}/MockIDRX.sol`],
    ["ReputationAdapter", ADAPTER, `${SRC}/ReputationAdapter.sol`],
    ["AI wallet (agent owner)", a?.agentAddress ?? "", undefined],
    ["Relayer", RELAYER, undefined],
    ["ERC-8004 Identity", IDENTITY, undefined],
    ["ERC-8004 Reputation", REPUTATION, undefined],
  ];
  const params: [string, string][] = [
    ["Credit limit", `${c ? Number(c.maxLoanBps) / 100 : 10}% of verified 30-day sales, capped by level`],
    ["Level ceilings", "Rp 1 jt · 2 jt · 4 jt · 8 jt (doubles after each repaid loan, max level 3)"],
    ["Minimum loan", "Rp 50.000"],
    ["Min distinct payers", String(c?.minPayers ?? 5)],
    ["Per-payer daily cap", c ? rupiah(BigInt(c.payerEpochCap)) : "Rp 250.000"],
    ["Minimum payment", c ? rupiah(BigInt(c.minPayment)) : "Rp 5.000"],
    ["Fee", `flat, ≤ ${c ? Number(c.maxFeeBps) / 100 : 5}% (the AI typically offers about 4%)`],
    ["Repay share", `≤ ${c ? Number(c.maxRepayBps) / 100 : 20}% of each sale (typically 10%)`],
    ["Offer validity", c ? `${Number(c.proposalTtl) / 3600} h` : "24 h"],
    ["Write-off", `${c ? Number(c.lateAfter) / 86400 : 14} days without sales during an active loan`],
    ["Pool", `≤ ${c ? Number(c.exposureBps) / 100 : 5}% per loan · ≤ ${c ? Number(c.dailyBudgetBps) / 100 : 20}% new loans/day · ${c ? Number(c.reserveBps) / 100 : 20}% of fees to the reserve`],
  ];
  return (
    <>
      <PHead route="/protocol/contracts" title="Contracts & verification" art={dev.iconVerifikasi} artW={90}
        lead="Every address is on BNB Smart Chain Testnet (97). Open BscScan to verify source and history." />

      <table className="p-table" data-testid="contracts-table">
        <thead><tr><th>Contract</th><th>Address</th><th>Source</th></tr></thead>
        <tbody>
          {rows.map(([n, addr, src]) => (
            <tr key={n}><td>{n}</td><td>{addr ? <Addr a={addr} /> : "…"}</td><td>{src ? <a href={src} target="_blank" rel="noreferrer">Source</a> : "—"}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="small">The product was named Kulaya late in the build. The core contract was deployed under its code name <code>Warung</code>, which is why wallets show &ldquo;Warung&rdquo; when signing.</p>

      <div className="p-grid w3" style={{ alignItems: "start" }}>
        <Sec title="Parameters (live values)">
          <table className="p-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>
            {params.map(([k, v]) => <tr key={k}><td>{k}</td><td className="p-mono" style={{ fontSize: 13 }}>{v}</td></tr>)}
          </tbody></table>
        </Sec>
        <div className="stack" style={{ gap: 24 }}>
          <Sec title="Loan lifecycle">
            <div className="p-card" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Tag kind="warn" icon="menunggu">PROPOSED</Tag><Icon name="lanjut" size={16} /><Tag kind="info" icon="cicilan">ACTIVE</Tag><Icon name="lanjut" size={16} /><Tag kind="pass">REPAID</Tag>
              <span className="small">or</span><Tag kind="block" icon="gagal">DEFAULTED</Tag><span className="small">· an unaccepted offer may</span><Tag kind="skip" icon="waktu">EXPIRE</Tag>
            </div>
          </Sec>
          <Sec title="Tests">
            <div className="p-card">
              <p><b style={{ font: "400 32px var(--k-font-display)", color: "var(--k-color-heading)" }}>33</b> Foundry tests: unit, fuzz, stateful invariants, relay attacks</p>
              <p><b style={{ font: "400 32px var(--k-font-display)", color: "var(--k-color-heading)" }}>32</b> TypeScript tests: policy layer, sessions, formatting, Telegram login codes</p>
              <PLink href={REPO} external><Icon name="kode" size={18} />Read the source on GitHub</PLink>
            </div>
          </Sec>
          <Sec title="One loan, end to end">
            <table className="p-table"><thead><tr><th>Step</th><th>Call</th></tr></thead><tbody>
              {[["Proposed", "proposeLoan"], ["Accepted", "acceptLoanFor (EIP-712, gasless)"], ["Repayment", "payFor (split on every sale)"], ["Closed", "repaid"], ["Reported", "giveFeedback (ERC-8004)"]].map(([s, f]) => <tr key={s}><td>{s}</td><td className="p-mono" style={{ fontSize: 13 }}>{f}</td></tr>)}
            </tbody></table>
          </Sec>
        </div>
      </div>
    </>
  );
}
