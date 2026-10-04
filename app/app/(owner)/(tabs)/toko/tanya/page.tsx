"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Gate } from "@/components/Gate";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button, Card, Icon } from "@/components/ui";
import * as mascot from "@/components/art/mascot";
import * as scene from "@/components/art/scene";
import { clearToken, getToken, signIn } from "@/lib/auth";
import { TG_URL } from "@/lib/brand";
import { t } from "@/lib/copy";
import { BOT_API, errText, rupiah } from "@/lib/web3";

type Item = { who: "me" | "ai"; text: string; links?: { amountRupiah: number; url: string }[]; loan?: { id: string; acceptUrl: string } | null };

export default function Tanya() {
  return <Gate>{({ viewer, wallet, shop, reload }) => <Chat viewer={viewer} wallet={wallet} nick={shop.profile.nickname || shop.profile.name || ""} onActivity={reload} />}</Gate>;
}

function Chat({ viewer, wallet, nick, onActivity }: { viewer: `0x${string}`; wallet: ReturnType<typeof Object> | null; nick: string; onActivity: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { setToken(getToken(viewer)); }, [viewer]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [items, busy]);

  async function login() {
    setErr("");
    try { setToken(await signIn(wallet as never, viewer)); } catch (e) { setErr(errText(e)); }
  }

  async function send(text: string) {
    text = text.trim();
    if (!text || busy || !token) return;
    setErr(""); setFailed(null); setBusy(true); setInput("");
    setItems((x) => [...x, { who: "me", text }]);
    try {
      const r = await fetch(`${BOT_API}/chat`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ message: text }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { clearToken(viewer); setToken(null); throw new Error(t("masuk.session.body")); }
      if (!r.ok) throw new Error(j.error ?? t("tanya.busy"));
      setItems((x) => [...x, { who: "ai", text: j.reply, links: j.paymentLinks, loan: j.loan }]);
      onActivity();
    } catch (e) { setFailed(text); setErr(errText(e)); } finally { setBusy(false); }
  }

  const top = <TopBar title={t("tanya.title")} back="/toko" />;

  if (!token) {
    return (
      <>
        {top}
        <main className="shell-main">
          <div className="stack-lg center">
            <Art svg={scene.illWalletConfirm} w={220} />
            <h1 className="h2">{t("tanya.login.title")}</h1>
            <p className="p">{t("tanya.login.body")}</p>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="cta-bar solo">
            {wallet ? <Button data-testid="chat-login" onClick={login}>{t("setup.connect.prep.btn")}</Button> : <Button href="/masuk" icon="dompet">{t("baru.wallet.connect")}</Button>}
            <Button kind="secondary" icon="telegram" href={TG_URL} external>{t("tanya.login.tg")}</Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {top}
      <main className="shell-main" style={{ gap: 14 }}>
        <a className="card tint" href={TG_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card-in" style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}><Icon name="telegram" size={24} /><span className="grow" style={{ fontWeight: 600, fontSize: 16 }}>{t("tanya.tg.banner")}</span><Icon name="lanjut" size={22} /></div>
        </a>
        {items.length === 0 && (
          <div className="stack-lg center" style={{ paddingTop: 8 }} data-testid="chat-empty">
            <Art svg={mascot.mascotGreet} w={120} />
            <h1 className="h2">{t("tanya.empty.title", { nick: nick || "Bu/Pak" })}</h1>
            <p className="p">{t("tanya.empty.body")}</p>
            <div className="stack" style={{ alignSelf: "stretch" }}>
              {[1, 2, 3, 4].map((n) => <button key={n} className="optionbtn" style={{ minHeight: 56, padding: "10px 16px" }} disabled={busy} onClick={() => send(t(`tanya.q.${n}` as never))}><b style={{ fontWeight: 600, color: "var(--k-color-text)" }}>{t(`tanya.q.${n}` as never)}</b></button>)}
            </div>
          </div>
        )}
        <div className="chat-log" aria-live="polite">
          {items.map((m, i) => (
            <div key={i} className="stack" style={{ gap: 8, alignItems: m.who === "me" ? "flex-end" : "flex-start" }}>
              <div className={`bubble ${m.who}`} data-testid={m.who === "ai" ? "msg-ai" : "msg-me"}>{m.text}</div>
              {m.links?.map((l) => (
                <Card key={l.url} variant="key" data-testid="chat-qr"><div className="row" style={{ gap: 14 }}>
                  <div className="qr-box"><QRCodeSVG value={l.url} size={112} /></div>
                  <div className="stack" style={{ gap: 8 }}><b className="money-md">{rupiah(BigInt(l.amountRupiah) * 100n)}</b><Button kind="secondary" sm inline href={l.url.replace(/^https?:\/\/[^/]+/, "")}>{t("tanya.card.qr.btn")}</Button></div>
                </div></Card>
              ))}
              {m.loan && <Card variant="soft" data-testid="chat-offer"><Button kind="accent" href="/toko/modal">{t("tanya.card.offer.btn")}</Button></Card>}
            </div>
          ))}
          {busy && <div className="bubble ai small" role="status">…</div>}
          <div ref={end} />
        </div>
        {failed && <Card variant="soft" data-testid="chat-busy"><div className="row" style={{ gap: 12 }}><Art svg={mascot.mascotApologetic} w={64} /><p className="p grow">{err || t("tanya.busy")}</p></div><Button kind="secondary" onClick={() => send(failed)}>{t("tanya.busy.btn")}</Button></Card>}
        <div className="chat-bar">
          <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input className="input plain" data-testid="chat-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder={t("tanya.input.placeholder")} disabled={busy} aria-label={t("tanya.input.placeholder")} />
            <button className="btn inline" style={{ width: 56, padding: 0 }} data-testid="chat-send" disabled={busy || !input.trim()} aria-label={t("tanya.send.aria")}><Icon name="kirim-chat" size={26} inv /></button>
          </form>
        </div>
      </main>
    </>
  );
}
