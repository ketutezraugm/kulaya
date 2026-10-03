"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Address } from "viem";
import { clearToken, getToken, signIn } from "@/lib/auth";
import { BOT_API, rupiah, errText, type useWallet } from "@/lib/web3";

type Wallet = NonNullable<ReturnType<typeof useWallet>["wallet"]>;
type Item = { who: "me" | "ai"; text: string; links?: { amountRupiah: number; url: string }[]; loan?: { id: string; acceptUrl: string } | null };

const SUGGESTIONS = ["Berapa penjualan saya hari ini?", "Saya mau pinjam modal", "Buatkan QR pembayaran Rp 50.000", "Bagaimana status pinjaman saya?"];

/** The same AI agent as on Telegram, in the browser. Needs a wallet sign-in so it only ever talks about the signer's own shop. */
export function Chat({ account, wallet, inject, onActivity }: { account: Address; wallet: Wallet | null; inject?: { n: number; text: string }; onActivity: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([{ who: "ai", text: "Halo! Saya asisten Warung Agent. Tanya penjualan, minta QR pembayaran, atau ajukan modal usaha: saya jawab dari data on-chain toko Anda." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const lastInject = useRef(0);

  useEffect(() => { setToken(getToken(account)); }, [account]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [items, busy]);

  async function login() {
    if (!wallet) return;
    setErr("");
    try { setToken(await signIn(wallet, account)); } catch (e) { setErr(errText(e)); }
  }

  async function send(text: string) {
    text = text.trim();
    if (!text || busy || !token) return;
    setErr(""); setBusy(true); setInput("");
    setItems((x) => [...x, { who: "me", text }]);
    try {
      const r = await fetch(`${BOT_API}/chat`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ message: text }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { clearToken(account); setToken(null); throw new Error("Session expired, please sign in again."); }
      if (!r.ok) throw new Error(j.error ?? "the assistant is unavailable");
      setItems((x) => [...x, { who: "ai", text: j.reply, links: j.paymentLinks, loan: j.loan }]);
      onActivity();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  // lets other widgets (e.g. "Ask the AI for an offer") drop a message into the chat
  useEffect(() => {
    // waits for any in-flight reply to finish instead of silently dropping the request
    if (inject && inject.n !== lastInject.current && token && !busy) { lastInject.current = inject.n; send(inject.text); }
  }, [inject, token, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="card">
        <b>Chat with your AI assistant</b>
        <p className="sub" style={{ margin: "6px 0 12px" }}>Sign in with your wallet to chat about your own shop. It's a free signature: no gas, no transaction, and it can't move any money.</p>
        <button onClick={login} disabled={!wallet}>Sign in to chat</button>
        {err && <p className="bad">{err}</p>}
      </div>
    );
  }
  return (
    <div className="card chat">
      <div className="chat-log">
        {items.map((m, i) => (
          <div key={i} className={`msg ${m.who}`}>
            <div className="bubble">{m.text}</div>
            {m.links?.map((l) => (
              <div key={l.url} className="bubble qr">
                <QRCodeSVG value={l.url} size={132} />
                <div><b>{rupiah(BigInt(l.amountRupiah) * 100n)}</b><br /><a href={l.url} target="_blank" rel="noreferrer">Open payment page</a></div>
              </div>
            ))}
            {m.loan && <a className="btn" style={{ alignSelf: "flex-start", marginTop: 6 }} href={m.loan.acceptUrl}>Review &amp; accept the loan</a>}
          </div>
        ))}
        {busy && <div className="msg ai"><div className="bubble sub">Sedang berpikir…</div></div>}
        <div ref={end} />
      </div>
      <div className="row" style={{ margin: "8px 0" }}>
        {SUGGESTIONS.map((s) => <button key={s} className="ghost chip-btn" onClick={() => send(s)} disabled={busy}>{s}</button>)}
      </div>
      <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder="Tulis pesan…" disabled={busy} />
        <button disabled={busy || !input.trim()}>Send</button>
      </form>
      {err && <p className="bad" style={{ margin: "8px 0 0" }}>{err}</p>}
    </div>
  );
}
