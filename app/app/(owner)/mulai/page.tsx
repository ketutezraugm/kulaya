"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button, Card, Icon, Pill, Steps } from "@/components/ui";
import * as scene from "@/components/art/scene";
import * as logo from "@/components/art/logo";
import * as mascot from "@/components/art/mascot";
import * as stall from "@/components/art/stall";
import { getToken, signIn } from "@/lib/auth";
import { RelayUnavailable, gaslessRegister } from "@/lib/gasless";
import { useShop } from "@/lib/shop";
import { t } from "@/lib/copy";
import { hasWalletConnect } from "@/lib/wallet";
import { BOT_API, WARUNG, errText, short, useWallet, warungAbi, write } from "@/lib/web3";

type Step = "tutorial" | "ask" | "guide" | "prep" | "wait" | "name" | "reg" | "link" | "done" | "already" | "cancel" | "network" | "nowallet" | "picker";
const CARDS = [scene.illStepScan, stall.illStallPerintis, scene.illEnvelopeOffer, scene.illStepSplit, scene.illCoinDrop];
const SEEN = "kulaya_tutorial_seen";
const GREET = () => { const h = new Date().getHours(); return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam"; };

function Screen({ top, children, cta }: { top?: ReactNode; children: ReactNode; cta?: ReactNode }) {
  return (
    <>
      {top}
      <main className="shell-main" style={{ gap: 20 }}>{children}</main>
      {cta && <div className="cta-bar solo" style={{ margin: 0 }}>{cta}</div>}
    </>
  );
}

function Mulai() {
  const q = useSearchParams();
  const router = useRouter();
  const code = q.get("code") ?? ""; // from the Telegram bot's /link: after registering we also link this wallet to the chat
  const { account, wallet, connect, error, ready } = useWallet();
  const { shop } = useShop(account);
  const [step, setStep] = useState<Step>("ask");
  const [card, setCard] = useState(0);
  const [name, setName] = useState("");
  const [nick, setNick] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(SEEN) === "1"; } catch { /* storage blocked */ }
    setStep(q.get("tutorial") || !seen ? "tutorial" : "ask");
  }, [q]);

  const finishTutorial = () => { try { localStorage.setItem(SEEN, "1"); } catch { /* ignore */ } setStep("ask"); };

  // phase 1 -> 2: once the wallet is connected, one free signature gives the session (also used to save the shop name)
  useEffect(() => {
    if (step !== "wait" || !account || !wallet || started) return;
    setStarted(true);
    (async () => {
      try {
        if (!getToken(account)) await signIn(wallet, account);
        setStep("name"); // may jump to "already" below once the shop reading arrives
      } catch (e) { setErr(errText(e)); setStep("cancel"); }
    })();
  }, [step, account, wallet, started]);
  useEffect(() => { if (shop?.registered && (step === "name" || step === "ask" || step === "wait")) setStep("already"); }, [shop, step]);

  const begin = useCallback(async (kind?: "injected" | "walletconnect") => {
    setErr(""); setStarted(false); setStep("wait");
    const a = await connect(kind);
    if (!a) setStep("cancel");
  }, [connect]);

  // a failed connect(): decide which screen explains it best
  useEffect(() => {
    if (step !== "cancel" || !error) return;
    if (/No wallet found/i.test(error)) setStep("nowallet");
    else if (/chain|network|4902/i.test(error) && !/reject|denied|cancel/i.test(error)) setStep("network");
  }, [step, error]);

  async function saveName() {
    if (!account) return;
    setErr(""); setBusy(true);
    try {
      const token = getToken(account) ?? (wallet ? await signIn(wallet, account) : null);
      if (!token) throw new Error(t("baru.wallet.only"));
      const r = await fetch(`${BOT_API}/profile`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ name, nickname: nick }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? t("baru.name.rule"));
      setStep("reg");
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  async function register() {
    if (!wallet || !account) return;
    setErr(""); setBusy(true);
    try {
      try { await gaslessRegister(wallet, account); } catch (e) {
        if (!(e instanceof RelayUnavailable)) throw e;
        await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "register" });
      }
      setStep(code ? "link" : "done");
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  async function linkTelegram() {
    if (!wallet || !account) return;
    setErr(""); setBusy(true);
    try {
      const signature = await wallet.signMessage({ message: `Link Kulaya Telegram: ${code}` });
      const r = await fetch(`${BOT_API}/link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, address: account, signature }) });
      if (!r.ok) throw new Error((await r.json()).error ?? "gagal menghubungkan");
      setStep("done");
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  const back = (to: Step) => <TopBar title={t("setup.title")} back={false} right={<button className="iconbtn" onClick={() => setStep(to)} aria-label={t("global.btn.kembali.aria")}><Icon name="kembali" size={26} /></button>} />;
  const errBox = err && <p className="err" role="alert" data-testid="setup-error">{err}</p>;
  const mobileLinks = typeof window !== "undefined" ? window.location.href.replace(/^https?:\/\//, "") : "";

  if (!ready && step !== "tutorial") return <Screen><div className="skeleton" style={{ height: 200 }} /></Screen>;

  if (step === "tutorial") {
    const last = card === CARDS.length - 1;
    return (
      <Screen
        top={<div className="row between" style={{ padding: "16px 20px 0" }}><Art svg={logo.logoLockup} w={110} /><button className="btn quiet inline sm" onClick={finishTutorial}>{t("tutorial.skip")}</button></div>}
        cta={<><div className="dots" aria-label={`Kartu ${card + 1} dari ${CARDS.length}`}>{CARDS.map((_, i) => <i key={i} className={i === card ? "on" : ""} />)}</div>
          <Button data-testid="tutorial-next" onClick={() => (last ? finishTutorial() : setCard(card + 1))}>{last ? t("tutorial.last") : t("tutorial.next")}</Button></>}
      >
        <div className="stack-lg" style={{ flex: 1, justifyContent: "center" }}>
          <Card variant="soft" awning pad={false} style={{ borderColor: "var(--k-color-ink)", borderWidth: 2 }}><Art svg={CARDS[card]} /></Card>
          <h1 className="h2" style={{ fontSize: 28 }}>{t(`tutorial.card.${card + 1}` as never)}</h1>
        </div>
      </Screen>
    );
  }

  if (step === "ask") {
    return (
      <Screen top={<TopBar title={t("setup.title")} back="/" />}>
        <Steps n={1} of={3} />
        <h2 className="h1">{t("setup.q.wallet")}</h2>
        <p className="p">{t("setup.q.wallet.explain")}</p>
        <button className="optionbtn" data-testid="have-wallet" onClick={() => setStep("prep")}><Icon name="dompet" size={32} /><span><b>{t("setup.opt.sudah")}</b><small>{t("setup.opt.sudah.sub")}</small></span></button>
        <button className="optionbtn" onClick={() => setStep("guide")}><Icon name="bantuan" size={32} /><span><b>{t("setup.opt.belum")}</b><small>{t("setup.opt.belum.sub")}</small></span></button>
        <Card variant="tint"><p className="p">{t("setup.tip.helper")}</p></Card>
      </Screen>
    );
  }

  if (step === "guide") {
    return (
      <Screen top={back("ask")} cta={<Button onClick={() => setStep("prep")}>{t("setup.guide.done")}</Button>}>
        <h2 className="h1">{t("setup.guide.title")}</h2>
        <ol className="stack-lg">{[1, 2, 3].map((n) => <li key={n} className="row" style={{ alignItems: "flex-start", gap: 12 }}><span className="row" style={{ width: 36, height: 36, borderRadius: 18, background: "var(--k-color-nila-900)", color: "#fff", justifyContent: "center", font: "400 20px var(--k-font-display)", flex: "none" }}>{n}</span><p className="p">{t(`setup.guide.${n}` as never)}</p></li>)}</ol>
        <Card variant="soft"><div className="row" style={{ gap: 12 }}><Art svg={mascot.mascotExplain} w={64} /><p className="p">{t("setup.guide.family")}</p></div></Card>
      </Screen>
    );
  }

  if (step === "prep") {
    return (
      <Screen top={back("ask")} cta={<Button data-testid="connect-ok" onClick={() => begin()}>{t("setup.connect.prep.btn")}</Button>}>
        <Steps n={1} of={3} />
        <h2 className="h1">{t("setup.connect.title")}</h2>
        <Art svg={scene.illWalletConfirm} />
        <Card variant="tint"><h3 className="h3">{t("setup.connect.prep.title")}</h3><p className="p">{t("setup.connect.prep.body")}</p><p className="small">{t("global.wallet.name_note")}</p></Card>
      </Screen>
    );
  }

  if (step === "wait") {
    return (
      <Screen top={<TopBar title={t("setup.title")} back={false} />} cta={<Button kind="quiet" onClick={() => setStep("prep")}>{t("setup.connect.wait.cancel")}</Button>}>
        <Steps n={1} of={3} />
        <div className="stack-lg center" style={{ paddingTop: 12 }} role="status" data-testid="setup-waiting">
          <Art svg={mascot.mascotThink} w={120} />
          <h2 className="h2">{t("setup.connect.wait.title")}</h2>
          <p className="p">{t("setup.connect.wait.body")}</p>
        </div>
      </Screen>
    );
  }

  if (step === "cancel") {
    return (
      <Screen top={back("prep")} cta={<Button onClick={() => begin()}>{t("states.cancel.btn")}</Button>}>
        <div className="stack-lg center" style={{ paddingTop: 12 }}>
          <Art svg={scene.illStateCancelled} w={240} />
          <h2 className="h2">{t("states.cancel.title")}</h2>
          <p className="p">{t("states.cancel.body")}</p>
          {err && <details className="details-tech" style={{ alignSelf: "stretch", textAlign: "left" }}><summary>{t("global.detail.teknisi")}</summary><pre>{err}</pre></details>}
        </div>
      </Screen>
    );
  }

  if (step === "network") {
    return (
      <Screen top={back("prep")} cta={<Button onClick={() => begin()}>{t("states.network.btn")}</Button>}>
        <Pill kind="wait" icon="peringatan">{t("states.network.pill")}</Pill>
        <h2 className="h1">{t("states.network.title")}</h2>
        <Art svg={scene.illWalletConfirm} />
      </Screen>
    );
  }

  if (step === "nowallet" || step === "picker") {
    return (
      <Screen top={back("ask")}>
        <Art svg={scene.illStateSlow} w={200} style={{ alignSelf: "center" }} />
        {step === "nowallet" ? <>
          <h2 className="h1">{t("states.nowallet.title")}</h2>
          <p className="p">{t("states.nowallet.body")}</p>
          <Button href="https://metamask.io/download/" external icon="unduh" data-testid="install-wallet">{t("states.nowallet.btn")}</Button>
          <Button kind="secondary" onClick={() => setStep("picker")}>{t("states.nowallet.btn2")}</Button>
        </> : <>
          <h2 className="h1">{t("states.picker.title")}</h2>
          <p className="p">{t("states.picker.body")}</p>
          <p className="label">{t("states.picker.recommended")}</p>
          <a className="optionbtn" href={`https://metamask.app.link/dapp/${mobileLinks}`}><Icon name="dompet" size={32} /><b>MetaMask</b></a>
          <a className="optionbtn" href={`https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.href)}`}><Icon name="dompet" size={32} /><b>Trust Wallet</b></a>
          {hasWalletConnect && <button className="optionbtn" onClick={() => begin("walletconnect")}><Icon name="koneksi" size={32} /><span><b>{t("states.picker.other")}</b><small>{t("states.picker.other.sub")}</small></span></button>}
        </>}
      </Screen>
    );
  }

  if (step === "name") {
    return (
      <Screen top={back("prep")} cta={<>{errBox}<Button data-testid="save-name" disabled={busy || name.trim().length < 2} onClick={saveName}>{t("setup.name.btn")}</Button></>}>
        <Steps n={2} of={3} />
        <h2 className="h1">{t("setup.name.title")}</h2>
        <div className="field"><label htmlFor="n1">{t("setup.name.label")}</label><input id="n1" className="input plain" data-testid="shop-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="organization" /><span className="small">{t("setup.name.hint")}</span></div>
        <div className="field"><label htmlFor="n2">{t("setup.nick.label")} <span style={{ fontWeight: 400 }}>{t("setup.nick.optional")}</span></label><input id="n2" className="input plain" data-testid="shop-nick" value={nick} maxLength={20} onChange={(e) => setNick(e.target.value)} /><span className="small">{t("setup.nick.hint")}</span></div>
        <div className="row" style={{ gap: 12, border: "1.5px dashed var(--k-color-border-strong)", borderRadius: 14, padding: 14 }}><Icon name="beranda" size={28} /><p className="p">{t("setup.nick.preview", { nick: nick || name || "…" }).replace("Selamat pagi", GREET())}</p></div>
      </Screen>
    );
  }

  if (step === "reg") {
    return (
      <Screen top={back("name")} cta={<>{errBox}<Button data-testid="register" disabled={busy || !wallet} onClick={register}>{busy ? t("setup.connect.wait.title") : t("setup.reg.btn")}</Button></>}>
        <Steps n={3} of={3} />
        <h2 className="h1">{t("setup.reg.title")}</h2>
        <p className="p">{t("setup.reg.body")}</p>
        <Art svg={scene.illWalletConfirm} />
        <Card><div className="kv"><span>{t("setup.reg.row.biaya").split(": ")[0]}</span><span>{t("setup.reg.row.biaya").split(": ")[1]}</span></div><div className="kv"><span>{t("setup.reg.row.uang").split(": ")[0]}</span><span>{t("setup.reg.row.uang").split(": ")[1]}</span></div></Card>
        <p className="small">{t("global.wallet.name_note")}</p>
      </Screen>
    );
  }

  if (step === "link") {
    return (
      <Screen cta={<>{errBox}<Button disabled={busy} onClick={linkTelegram} icon="telegram">{t("baru.link.btn")}</Button></>}>
        <h2 className="h1">{t("baru.link.title")}</h2>
        <p className="p">{t("baru.link.body")}</p>
        <Art svg={scene.illWalletConfirm} />
      </Screen>
    );
  }

  if (step === "already") {
    return (
      <Screen cta={<Button href="/toko" data-testid="to-beranda">{t("states.already.btn")}</Button>}>
        <Pill kind="info">{t("states.already.pill")}</Pill>
        <h2 className="h1">{t("states.already.title", { shop: shop?.profile?.name ?? (account ? short(account) : "") })}</h2>
        <p className="p">{t("states.already.body")}</p>
        <Art svg={scene.illRegistered} />
      </Screen>
    );
  }

  return (
    <Screen cta={<><Button kind="accent" href="/toko/terima" data-testid="setup-done">{t("setup.done.btn")}</Button><Button kind="quiet" href="/toko" onClick={() => router.prefetch("/toko")}>{t("setup.done.quiet")}</Button></>}>
      <Pill kind="ok">{t("setup.done.pill")}</Pill>
      <h2 className="h1">{t("setup.done.title")}</h2>
      <p className="p">{t("setup.done.body")}</p>
      <Art svg={scene.illRegistered} />
    </Screen>
  );
}

export default function Page() { return <Suspense><Mulai /></Suspense>; }
