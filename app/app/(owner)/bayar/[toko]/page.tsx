"use client";
import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";
import { Art, Button, Card, Icon, Pill } from "@/components/ui";
import * as logo from "@/components/art/logo";
import * as scene from "@/components/art/scene";
import * as mascot from "@/components/art/mascot";
import { t } from "@/lib/copy";
import { demoWallet } from "@/lib/demo";
import { RelayUnavailable, gaslessFaucet, gaslessPay } from "@/lib/gasless";
import { hasWalletConnect } from "@/lib/wallet";
import { BOT_API, IDRX, WARUNG, erc20Abi, errText, publicClient, rupiah, short, txLink, useWallet, warungAbi, warungRead, write } from "@/lib/web3";

const MIN_RP = 5000; // the contract rejects smaller payments (dust)
const dots = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Bayar({ merchant }: { merchant: Address }) {
  const q = useSearchParams();
  // a QR without an amount is the general shop QR (e.g. on the stall poster): the customer types the amount
  const urlAmount = Math.floor(Number(q.get("amount") ?? 0)) || 0;
  const [typed, setTyped] = useState("");
  const amountRp = urlAmount || Math.floor(Number(typed) || 0);
  const note = (q.get("note") ?? "").slice(0, 140);
  const payable = amountRp >= MIN_RP;
  const { account, wallet, connect, error } = useWallet();
  const [shopName, setShopName] = useState<string | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [bal, setBal] = useState<bigint | null>(null);
  const [busy, setBusy] = useState("");
  const [tx, setTx] = useState("");
  const [paidRp, setPaidRp] = useState(0);
  const [err, setErr] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [low, setLow] = useState(false);
  const [noWallet, setNoWallet] = useState(false);
  const [prep, setPrep] = useState(false);
  const units = BigInt(amountRp) * 100n;

  useEffect(() => { warungRead("merchants", [merchant]).then((m) => setRegistered(m[0])).catch(() => setRegistered(true)); }, [merchant]);
  useEffect(() => { fetch(`${BOT_API}/profile?merchant=${merchant}`).then((r) => r.json()).then((j) => setShopName(j.name ?? null)).catch(() => {}); }, [merchant]);
  useEffect(() => { setNoWallet(!window.ethereum && !hasWalletConnect); }, []);
  useEffect(() => { if (account) publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [account] }).then(setBal); }, [account, tx]);
  const name = shopName ?? short(merchant);

  const fail = (e: unknown) => {
    const m = errText(e);
    if (/reject|denied|cancel|4001/i.test(m)) setCancelled(true); else setErr(m);
  };
  const done = (hash: string) => { setTx(hash); setPaidRp(amountRp); };

  async function pay() {
    setErr(""); setCancelled(false); setPrep(false);
    try {
      if (!wallet || !account) return;
      if (bal !== null && bal < units) { setLow(true); return; }
      try {
        setBusy(t("bayar.prep.title"));
        done(await gaslessPay(wallet, account, merchant, units, note));
        return;
      } catch (e) { if (!(e instanceof RelayUnavailable)) throw e; }
      const nonce = await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "nonces", args: [account] });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const sig = await wallet.signTypedData({
        domain: { name: "Mock IDRX", version: "1", chainId: 97, verifyingContract: IDRX },
        types: { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
        primaryType: "Permit", message: { owner: account, spender: WARUNG, value: units, nonce, deadline },
      });
      const r = `0x${sig.slice(2, 66)}` as const, s = `0x${sig.slice(66, 130)}` as const, v = parseInt(sig.slice(130, 132), 16);
      done(await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "payWithPermit", args: [merchant, units, note, deadline, v, r, s] }));
    } catch (e) { fail(e); } finally { setBusy(""); }
  }

  /** No wallet needed: a throwaway browser-local testnet wallet gets free test IDRX and pays through the same gasless flow. */
  async function payDemo() {
    setErr(""); setCancelled(false);
    try {
      const { account: a, wallet: w } = demoWallet();
      if (a.address.toLowerCase() === merchant.toLowerCase()) throw new Error("dompet demo tidak bisa membayar dirinya sendiri");
      const have = await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [a.address] });
      if (have < units) { setBusy(t("baru.demo.paying")); await gaslessFaucet(a.address); }
      setBusy(t("baru.demo.paying"));
      done(await gaslessPay(w, a.address, merchant, units, note));
    } catch (e) {
      setErr(e instanceof RelayUnavailable ? t("err.busy.body") : errText(e));
    } finally { setBusy(""); }
  }

  async function faucet() {
    if (!wallet || !account) return;
    setErr(""); setBusy(t("baru.demo.paying"));
    try {
      try { await gaslessFaucet(account); } catch (e) { if (!(e instanceof RelayUnavailable)) throw e; await write(wallet, { address: IDRX, abi: erc20Abi, functionName: "mint", args: [account, 100_000_000n] }); }
      setBal(await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [account] }));
      setLow(false);
    } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  }

  const header = <header className="row" style={{ padding: "16px 20px 0" }}><Art svg={logo.logoLockup} w={104} /></header>;
  const href = typeof window === "undefined" ? "" : window.location.href;

  if (registered === false) return <>{header}<main className="shell-main"><div className="stack-lg center"><Art svg={scene.illShutterClosed} w={240} /><h1 className="h2">{t("baru.notreg")}</h1></div></main></>;

  if (tx) {
    return (
      <>
        {header}
        <main className="shell-main" data-testid="paid" role="status">
          <div className="stack center" style={{ gap: 12, paddingTop: 12 }}>
            <div className="stamp-in"><Pill kind="ok">{t("bayar.ok.pill")}</Pill></div>
            <Art svg={mascot.mascotCelebrate} w={140} />
            <h1 className="h1">{t("bayar.ok.title")}</h1>
          </div>
          <div className="nota"><div className="nota-in"><div className="stack" style={{ paddingTop: 12 }}>
            <div className="kv"><span>{t("bayar.ok.paid")}</span><span className="money-md">{rupiah(BigInt(paidRp) * 100n)}</span></div>
            <div className="kv"><span>{t("bayar.title", { shop: "" }).replace(/\s+$/, "")}</span><span>{name}</span></div>
            {note && <div className="kv"><span>Catatan</span><span>{note}</span></div>}
          </div></div></div>
          <a className="btn secondary" href={txLink(tx)} target="_blank" rel="noreferrer"><Icon name="tautan-luar" size={22} /><span>{t("bayar.ok.proof")}</span></a>
          <Button kind="quiet" href={`/t/${merchant}`}>{name}</Button>
        </main>
      </>
    );
  }

  if (low) {
    return (
      <>
        {header}
        <main className="shell-main">
          <Pill kind="wait" icon="peringatan">{t("bayar.low.pill")}</Pill>
          <h1 className="h1">{t("bayar.low.title")}</h1>
          <p className="p">{t("bayar.low.body", { rp: rupiah(units) })}</p>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="cta-bar solo"><Button kind="accent" disabled={!!busy} onClick={faucet}>{busy || t("bayar.low.btn")}</Button></div>
        </main>
      </>
    );
  }

  if (cancelled) {
    return (
      <>
        {header}
        <main className="shell-main">
          <div className="stack-lg center"><Art svg={scene.illStateCancelled} w={240} /><h1 className="h2">{t("bayar.cancel.title")}</h1><p className="p">{t("bayar.cancel.body")}</p></div>
          <div className="cta-bar solo"><Button onClick={() => setCancelled(false)}>{t("states.cancel.btn")}</Button></div>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="shell-main">
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1" data-testid="pay-title">{t("bayar.title", { shop: name })}</h1>
          {note && <p className="lead">“{note}”</p>}
        </div>

        {urlAmount ? (
          <Card variant="key" awning><span className="label">{t("bayar.ok.paid")}</span><span className="money-xl" data-testid="pay-amount">{rupiah(units)}</span></Card>
        ) : (
          <div className="stack">
            <h2 className="h3" style={{ fontSize: 22 }}>{t("bayar.open.title")}</h2>
            <div className="row input" style={{ gap: 8 }}><b style={{ font: "400 28px var(--k-font-display)" }}>Rp</b><input aria-label="Jumlah dalam rupiah" data-testid="amount-input" inputMode="numeric" value={typed ? dots(Number(typed.replace(/\D/g, ""))) : ""} onChange={(e) => setTyped(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="25.000" style={{ border: 0, outline: "none", flex: 1, minWidth: 0, font: "400 32px var(--k-font-display)", background: "transparent" }} /></div>
            <div className="chips grid4">{[10000, 25000, 50000, 100000].map((v) => <button key={v} className="chipbtn" aria-pressed={amountRp === v} onClick={() => setTyped(String(v))}>{dots(v)}</button>)}</div>
            <span className={amountRp > 0 && !payable ? "err" : "small"} data-testid="amount-hint">{t("bayar.open.hint")}</span>
          </div>
        )}

        <p className="small">{t("bayar.loan.note")}</p>
        <Card variant="tint"><div className="row" style={{ alignItems: "flex-start", gap: 10 }}><Icon name="peringatan" size={26} /><p className="p grow">{t("bayar.notqris")}</p></div></Card>

        {busy && <p className="small" role="status" data-testid="pay-busy">{busy}…</p>}
        {(err || error) && <p className="err" role="alert" data-testid="pay-error">{err || error}</p>}

        <div className="stack">
          {account
            ? <><p className="small">{account && bal !== null ? `${short(account)} · ${rupiah(bal)}` : short(account)}</p><Button disabled={!payable || !!busy} data-testid="pay-wallet" onClick={() => setPrep(true)}>{t("bayar.btn.pay")}</Button></>
            : <Button disabled={!!busy} data-testid="connect-wallet" icon="dompet" onClick={() => connect()}>{t("baru.wallet.connect")}</Button>}
          <Button kind="secondary" disabled={!payable || !!busy} data-testid="pay-demo" onClick={payDemo}>{t("bayar.btn.demo")}</Button>
          <p className="small">{t("bayar.demo.hint")}</p>
          {!account && noWallet && href && (
            <p className="small" data-testid="wallet-links">
              <a href={`https://metamask.app.link/dapp/${href.replace(/^https?:\/\//, "")}`}>MetaMask</a> · <a href={`https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(href)}`}>Trust Wallet</a>
            </p>
          )}
        </div>

        {prep && (
          <div className="sheet-back" onClick={() => setPrep(false)}>
            <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <Art svg={scene.illWalletConfirm} w={200} style={{ alignSelf: "center" }} />
              <h2 className="h2">{t("bayar.prep.title")}</h2>
              <p className="p">{t("bayar.prep.body", { rp: rupiah(units), shop: name })}</p>
              <p className="small">{t("global.wallet.name_note")}</p>
              <Button data-testid="pay-confirm" onClick={pay}>{t("setup.connect.prep.btn")}</Button>
              <Button kind="quiet" onClick={() => setPrep(false)}>{t("setup.connect.wait.cancel")}</Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function Page({ params }: { params: Promise<{ toko: string }> }) {
  const { toko } = use(params);
  return <Suspense><Bayar merchant={toko as Address} /></Suspense>;
}
