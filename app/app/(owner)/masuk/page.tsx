"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button, Icon } from "@/components/ui";
import * as scene from "@/components/art/scene";
import * as mascot from "@/components/art/mascot";
import { loginWithTelegramCode, signIn } from "@/lib/auth";
import { TG_URL } from "@/lib/brand";
import { t } from "@/lib/copy";
import { errText, useWallet } from "@/lib/web3";

/** Two meanings on one route: with ?t=<code> it exchanges the bot's one-tap code (POST, so link previews can't burn it); without it, the "how do you want to sign in" screen. */
function Masuk() {
  const q = useSearchParams();
  const code = q.get("t") ?? "";
  const expired = q.get("sesi") === "habis";
  const router = useRouter();
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const { account, wallet, connect, ready } = useWallet();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) return;
    if (!/^[0-9a-f]{32}$/.test(code)) { setErr(t("baru.tg.bad")); return; }
    loginWithTelegramCode(code).then(() => router.replace("/toko")).catch((e) => setErr((e as Error).message || t("baru.tg.bad")));
  }, [code, router]);

  // wallet sign-in: connect, then one free signature, then straight to the shop
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started || !account || !wallet) return;
    setStarted(false);
    signIn(wallet, account).then(() => router.replace("/toko")).catch((e) => { setErr(errText(e)); setBusy(false); });
  }, [started, account, wallet, router]);

  if (code) {
    return (
      <>
        <TopBar title={t("masuk.title")} back="/" />
        <main className="shell-main" data-testid="masuk-exchange">
          {err
            ? <div className="stack-lg center"><Art svg={scene.illStateSession} w={220} /><p className="p" role="alert" data-testid="masuk-error">{err}</p><Button href={TG_URL} external icon="telegram">{t("landing.tg.btn")}</Button></div>
            : <div className="stack-lg center"><Art svg={mascot.mascotThink} w={120} /><p className="p" role="status">{t("baru.tg.checking")}</p></div>}
        </main>
      </>
    );
  }

  if (sent) {
    return (
      <>
        <TopBar title={t("masuk.title")} back={false} right={<button className="iconbtn" onClick={() => setSent(false)} aria-label={t("global.btn.kembali.aria")}><Icon name="kembali" size={26} /></button>} />
        <main className="shell-main">
          <div className="stack-lg center">
            <Art svg={mascot.mascotPoint} w={140} />
            <h1 className="h1">{t("masuk.tg.sent.title")}</h1>
            <p className="p">{t("baru.tg.how")}</p>
            <p className="small">{t("masuk.tg.sent.tip")}</p>
          </div>
          <div className="cta-bar solo">
            <Button href={TG_URL} external icon="telegram">{t("landing.tg.btn")}</Button>
            <Button kind="quiet" onClick={() => { setSent(false); setStarted(true); setBusy(true); connect(); }}>{t("masuk.tg.sent.alt")}</Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={expired ? t("masuk.session.title") : t("masuk.title")} back="/" />
      <main className="shell-main">
        <div className="stack-lg center">
          <Art svg={expired ? scene.illStateSession : mascot.mascotGreet} w={expired ? 220 : 140} />
          <p className="p">{expired ? t("masuk.session.body") : t("masuk.body")}</p>
        </div>
        <button className="optionbtn" data-testid="login-telegram" onClick={() => setSent(true)}><Icon name="telegram" size={32} /><span><b>{t("masuk.tg.btn")}</b><small>{t("masuk.tg.hint")}</small></span></button>
        <button className="optionbtn" data-testid="login-wallet" disabled={busy || !ready} onClick={() => { setErr(""); setBusy(true); setStarted(true); connect().then((a) => { if (!a) { setBusy(false); setStarted(false); } }); }}><Icon name="dompet" size={32} /><span><b>{t("masuk.wallet.btn")}</b></span></button>
        {err && <p className="err" role="alert">{err}</p>}
        <Link href="/mulai" className="center" style={{ textAlign: "center", fontWeight: 700 }}>{t("masuk.new")}</Link>
      </main>
    </>
  );
}

export default function Page() { return <Suspense><Masuk /></Suspense>; }
