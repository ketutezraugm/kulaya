"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { Addr, PHead, Sec, Stat, Tag, jt } from "@/components/proto";
import { gaslessFaucet, RelayUnavailable } from "@/lib/gasless";
import { EXPLORER, IDRX, WARUNG, erc20Abi, errText, publicClient, rupiah, txLink, useWallet, warungAbi, warungRead, write } from "@/lib/web3";

const BSC_TESTNET = 97;
type PoolState = { assets: bigint; loanedOut: bigint; reserve: bigint; shares: bigint; idle: bigint; mine: bigint; bal: bigint; p: any };

export default function Pool() {
  const { account, wallet, connect, error } = useWallet();
  const [s, setS] = useState<PoolState | null>(null);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("500000");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ what: string; tx?: string } | null>(null);
  const [chain, setChain] = useState<number | null>(null);

  const load = async () => {
    const [assets, loanedOut, reserve, shares, idle, p] = await Promise.all([warungRead("totalAssets"), warungRead("loanedOut"), warungRead("reserve"), warungRead("totalShares"), warungRead("idle"), warungRead("p")]);
    const mine = account ? await warungRead("shares", [account]) : 0n;
    const bal = account ? await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [account] }) : 0n;
    setS({ assets, loanedOut, reserve, shares, idle, mine, bal, p });
  };
  useEffect(() => { load().catch((e) => setErr(e.message.split("\n")[0])); }, [account]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.ethereum?.request({ method: "eth_chainId" }).then((c: string) => setChain(parseInt(c, 16))).catch(() => {}); }, [account]);

  const run = async (label: string, what: string, fn: () => Promise<string | void>) => {
    setErr(""); setDone(null); setBusy(label);
    try { const tx = await fn(); await load(); setDone({ what, tx: tx || undefined }); } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  };
  const units = BigInt(Math.max(0, Math.floor(Number(amount.replace(/\D/g, "")) || 0))) * 100n;
  const deposit = () => run("Approve + deposit submitted. Waiting for confirmation…", `${rupiah(units)} added to the pool.`, async () => {
    if (!wallet || !account) return;
    const al = await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "allowance", args: [account, WARUNG] });
    if (al < units) await write(wallet, { address: IDRX, abi: erc20Abi, functionName: "approve", args: [WARUNG, units] });
    return write(wallet, { address: WARUNG, abi: warungAbi, functionName: "deposit", args: [units] });
  });
  const withdraw = () => run("Withdrawing…", "Your stake was withdrawn (up to cash on hand).", async () => { if (wallet && s && s.mine > 0n) return write(wallet, { address: WARUNG, abi: warungAbi, functionName: "withdraw", args: [s.mine] }); });
  const faucet = () => run("Minting test IDRX…", "Test IDRX added to your wallet.", async () => {
    if (!wallet || !account) return;
    try { await gaslessFaucet(account); } catch (e) { if (!(e instanceof RelayUnavailable)) throw e; return write(wallet, { address: IDRX, abi: erc20Abi, functionName: "mint", args: [account, 100_000_000n] }); }
  });
  const switchNet = async () => { try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x61" }] }); setChain(BSC_TESTNET); } catch (e) { setErr(errText(e)); } };

  const myValue = s && s.shares > 0n ? (s.mine * s.assets) / s.shares : 0n;
  const share = s && s.shares > 0n ? Number((s.mine * 10000n) / s.shares) / 100 : 0;
  const wrongNet = !!account && chain !== null && chain !== BSC_TESTNET;
  const p = s?.p;
  return (
    <>
      <PHead route="/protocol/pool" title="Lending pool" lead="Lenders deposit test IDRX and earn the flat fees shops pay. Every loan is bounded by the pool rules below." />

      <div className="p-grid">
        <Stat label="Pool value" value={s ? jt(s.assets) : "…"} sub="IDRX (test)" testid="pool-value" />
        <Stat label="Out on loan" value={s ? jt(s.loanedOut) : "…"} />
        <Stat label="Idle" value={s ? jt(s.idle) : "…"} sub="available to withdraw" />
        <Stat label="Reserve" value={s ? jt(s.reserve) : "…"} sub="first-loss, protects LPs" />
      </div>

      <Sec title="Risk protections">
        <div className="p-grid">
          {[[p ? `${p[8] / 100}%` : "5%", "Per-loan exposure", "No single loan above this share of pool value."], [p ? `${p[9] / 100}%` : "20%", "Daily budget", "New loans per day capped at this share of the pool."], [p ? `${p[10] / 100}%` : "20%", "First-loss reserve", "This share of every fee absorbs defaults before LPs."], ["Always", "Withdrawals open", "Even when lending is paused (up to cash on hand)."]].map(([big, t, d]) => (
            <div className="p-card" key={t}><b style={{ font: "400 28px var(--k-font-display)", color: "var(--k-color-heading)" }}>{big}</b><b>{t}</b><p className="small">{d}</p></div>
          ))}
        </div>
      </Sec>

      <Sec title="Your stake">
        <div className="p-card key" style={{ maxWidth: 520 }}>
          {!account ? (
            <>
              <Tag kind="info">CONNECT</Tag>
              <p>Connect a wallet to deposit or see your stake.</p>
              <button className="p-btn" onClick={() => connect()} data-testid="pool-connect">Connect wallet</button>
            </>
          ) : wrongNet ? (
            <>
              <Tag kind="warn">WRONG NETWORK</Tag>
              <p>Your wallet is on another chain. Switch to BNB Smart Chain Testnet (97).</p>
              <button className="p-btn" onClick={switchNet}>Switch network</button>
            </>
          ) : (
            <>
              <Tag kind="pass">CONNECTED</Tag>
              <b style={{ font: "400 28px var(--k-font-display)", color: "var(--k-color-heading)" }}>{rupiah(myValue)}</b>
              <p className="small">{share.toFixed(1).replace(".", ",")}% of pool · wallet balance {s ? rupiah(s.bal) : "…"} test IDRX</p>
              <div role="tablist" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "2px solid var(--k-color-ink)", borderRadius: 10, overflow: "hidden" }}>
                {(["deposit", "withdraw"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ minHeight: 40, border: 0, font: "700 15px var(--k-font-body)", textTransform: "capitalize", background: tab === t ? "var(--k-color-primary)" : "var(--k-color-surface)", color: tab === t ? "var(--k-color-on-primary)" : "var(--k-color-text)" }}>{t}</button>)}
              </div>
              {tab === "deposit" ? (
                <>
                  <div><label className="p-label" htmlFor="pa">Amount (IDRX)</label><input id="pa" className="p-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="pool-amount" /></div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="p-btn" disabled={!!busy || units === 0n} onClick={deposit} data-testid="pool-deposit">Deposit {rupiah(units)}</button>
                    <button className="p-btn secondary" disabled={!!busy} onClick={faucet}>Get test IDRX</button>
                  </div>
                </>
              ) : <button className="p-btn" disabled={!!busy || !s || s.mine === 0n} onClick={withdraw}>Withdraw all</button>}
              {busy && <Tag kind="warn" icon="waktu">PENDING</Tag>}
              {busy && <p className="small">{busy}</p>}
              {done && <><Tag kind="pass">DONE</Tag><p>{done.what}</p>{done.tx && <a href={txLink(done.tx)} target="_blank" rel="noreferrer">View transaction</a>}</>}
            </>
          )}
          {(err || error) && <p role="alert" style={{ color: "var(--k-color-danger)", fontWeight: 600 }}>{err || error}</p>}
        </div>
        <p className="small">Testnet demo with mock IDRX, not financial advice.</p>
        <Addr a={WARUNG} />
      </Sec>
    </>
  );
}
