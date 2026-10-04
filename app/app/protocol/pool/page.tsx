"use client";
import { useEffect, useState } from "react";
import { gaslessFaucet, RelayUnavailable } from "@/lib/gasless";
import { IDRX, WARUNG, erc20Abi, warungAbi, warungRead, publicClient, useWallet, write, errText, rupiah } from "@/lib/web3";

export default function Pool() {
  const { account, wallet, connect, error } = useWallet();
  const [s, setS] = useState<any>(null);
  const [amount, setAmount] = useState("1000000");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const [assets, loanedOut, reserve, shares, idle, p] = await Promise.all([warungRead("totalAssets"), warungRead("loanedOut"), warungRead("reserve"), warungRead("totalShares"), warungRead("idle"), warungRead("p")]);
    const mine = account ? await warungRead("shares", [account]) : 0n;
    const bal = account ? await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [account] }) : 0n;
    setS({ assets, loanedOut, reserve, shares, idle, mine, bal, p });
  };
  useEffect(() => { load().catch((e) => setErr(e.message.split("\n")[0])); }, [account]);

  const run = async (label: string, fn: () => Promise<unknown>) => { setErr(""); setBusy(label); try { await fn(); await load(); } catch (e) { setErr(errText(e)); } finally { setBusy(""); } };
  const units = BigInt(Math.max(0, Math.floor(Number(amount) || 0))) * 100n;

  const deposit = () => run("Depositing…", async () => {
    if (!wallet || !account) return;
    const al = await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "allowance", args: [account, WARUNG] });
    if (al < units) await write(wallet, { address: IDRX, abi: erc20Abi, functionName: "approve", args: [WARUNG, units] });
    await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "deposit", args: [units] });
  });
  const withdraw = () => run("Withdrawing…", async () => { if (wallet && s.mine > 0n) await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "withdraw", args: [s.mine] }); });
  const faucet = () => run("Minting…", async () => {
    if (!wallet || !account) return;
    try { await gaslessFaucet(account); } catch (e) { if (!(e instanceof RelayUnavailable)) throw e; await write(wallet, { address: IDRX, abi: erc20Abi, functionName: "mint", args: [account, 100_000_000n] }); }
  });

  const myValue = s && s.shares > 0n ? (s.mine * s.assets) / s.shares : 0n;
  return (
    <>
      <h1>Fund local shops</h1>
      <p className="sub">Deposit stablecoins into the public pool. It lends to verified small shops and you earn the loan fees. Every loan and repayment is public.</p>
      {s && (
        <div className="grid">
          <div className="stat"><small>Pool value</small><strong>{rupiah(s.assets)}</strong></div>
          <div className="stat"><small>Out on loan</small><strong>{rupiah(s.loanedOut)}</strong></div>
          <div className="stat"><small>Available now</small><strong>{rupiah(s.idle)}</strong></div>
          <div className="stat"><small>First-loss reserve (protects you)</small><strong>{rupiah(s.reserve)}</strong></div>
        </div>
      )}
      <div className="card">
        {!account ? <button onClick={connect}>Connect wallet</button> : (
          <>
            <p className="sub">Your wallet: {s ? rupiah(s.bal) : "…"} test IDRX · your pool stake: <b>{rupiah(myValue)}</b> <button className="ghost" onClick={faucet} disabled={!!busy}>Get test IDRX</button></p>
            <label>Amount (Rp)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
            <div className="row" style={{ marginTop: 12 }}>
              <button onClick={deposit} disabled={!!busy || units === 0n}>Deposit</button>
              <button className="ghost" onClick={withdraw} disabled={!!busy || !s || s.mine === 0n}>Withdraw all</button>
            </div>
          </>
        )}
        {busy && <p className="sub">{busy}</p>}
        {(err || error) && <p className="bad">{err || error}</p>}
      </div>
      {s && <p className="sub">How you're protected: each loan is capped at {s.p[8] / 100}% of the pool, new lending per day at {s.p[9] / 100}%, and {s.p[10] / 100}% of every fee goes into a reserve that absorbs defaults first. Withdrawals always work (up to cash on hand), even if lending is paused. Testnet demo, not financial advice.</p>}
    </>
  );
}
