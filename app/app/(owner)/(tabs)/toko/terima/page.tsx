"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { Address } from "viem";
import { Gate } from "@/components/Gate";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button, Card, Icon, Pill } from "@/components/ui";
import * as scene from "@/components/art/scene";
import { t } from "@/lib/copy";
import { BOT_API, rupiah } from "@/lib/web3";

type Received = { amount: bigint; cut: bigint; customerNo: number; memo: string };
const dots = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Terima({ address, shopName, minRp, onReceived }: { address: Address; shopName: string; minRp: number; onReceived: () => void }) {
  const [digits, setDigits] = useState("50000");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"amount" | "qr" | "ok">("amount");
  const [general, setGeneral] = useState(false);
  const [full, setFull] = useState(false);
  const [received, setReceived] = useState<Received | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const n = Math.min(Number(digits) || 0, 99_999_999);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = general ? `${origin}/bayar/${address}` : `${origin}/bayar/${address}?amount=${n}${note ? `&note=${encodeURIComponent(note.slice(0, 100))}` : ""}`;

  // Live "Pembayaran diterima!": start from the chain's current head, then poll for newer sales of this shop.
  const watching = mode === "qr";
  useEffect(() => {
    if (!watching) return;
    let stop = false;
    let cursor: string | null = null;
    const want = general ? null : BigInt(n) * 100n; // fixed mode waits for this exact amount, general mode for any payment
    const tick = async () => {
      try {
        const r = await fetch(`${BOT_API}/payments?merchant=${address}${cursor ? `&after=${cursor}` : ""}`, { cache: "no-store" }).then((x) => x.json());
        if (stop || r.head === undefined) return;
        if (cursor !== null) {
          const hit = (r.sales as { amount: string; repaidCut: string; customerNo: number; memo?: string }[]).find((s) => want === null || BigInt(s.amount) === want);
          if (hit) { setReceived({ amount: BigInt(hit.amount), cut: BigInt(hit.repaidCut), customerNo: hit.customerNo, memo: hit.memo ?? "" }); setMode("ok"); setFull(false); onReceived(); return; }
        }
        cursor = String(r.head);
      } catch { /* a missed poll is fine, the next one catches up */ }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(id); };
  }, [watching, general, n, address, onReceived]);

  // fullscreen QR: keep the screen awake and let the browser go fullscreen where it can
  const fsEl = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!full) return;
    let lock: { release(): Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request(k: string): Promise<{ release(): Promise<void> }> } }).wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    fsEl.current?.requestFullscreen?.().catch(() => {});
    return () => { lock?.release().catch(() => {}); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [full]);
  useEffect(() => { const h = () => { if (!document.fullscreenElement) setFull(false); }; document.addEventListener("fullscreenchange", h); return () => document.removeEventListener("fullscreenchange", h); }, []);

  const press = useCallback((k: string) => setDigits((d) => (k === "<" ? d.slice(0, -1) : (d + k).replace(/^0+/, "").slice(0, 8))), []);
  const download = () => {
    const c = box.current?.querySelector("canvas");
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = general ? "kulaya-qr-toko.png" : `kulaya-qr-${n}.png`;
    a.click();
  };
  const share = async () => {
    const text = t("terima.share.wa", { rp: general ? "" : rupiah(BigInt(n) * 100n), shop: shopName, url });
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  const reset = () => { setReceived(null); setMode("amount"); };

  if (mode === "ok" && received) {
    return (
      <>
        <TopBar title={t("terima.title")} back="/toko" />
        <main className="shell-main" role="status" data-testid="received">
          <Card variant="tint" pad={false}><div className="coin-drop" style={{ padding: 8 }}><Art svg={scene.illCoinDrop} /></div></Card>
          <Pill kind="ok">{t("terima.ok.pill")}</Pill>
          <div className="stack center" style={{ gap: 6 }}>
            <span className="money-xl" style={{ fontSize: 48 }}>{rupiah(received.amount)}</span>
            <span className="small">{received.memo ? `${received.memo} · ` : ""}{t("riwayat.customer", { n: received.customerNo })}</span>
          </div>
          <div className="card"><div className="card-in">
            <div className="kv"><span>{t("terima.ok.row.pay")}</span><span>{rupiah(received.amount)}</span></div>
            {received.cut > 0n && <div className="kv"><span className="row" style={{ gap: 8 }}><Icon name="cicilan" size={22} />{t("terima.ok.row.cicilan")}</span><span className="warn-t">{rupiah(received.cut)}</span></div>}
            <hr className="rule" />
            <div className="kv"><b>{t("terima.ok.row.you")}</b><span className="money-md">{rupiah(received.amount - received.cut)}</span></div>
          </div></div>
          <div className="cta-bar solo">
            <Button kind="accent" icon="terima-bayar" onClick={reset} data-testid="receive-again">{t("terima.ok.btn")}</Button>
            <Button kind="quiet" href="/toko">{t("terima.ok.quiet")}</Button>
          </div>
        </main>
      </>
    );
  }

  if (mode === "qr") {
    return (
      <>
        <TopBar title={t("terima.title")} back={false} right={<button className="iconbtn" onClick={() => setMode("amount")} aria-label={t("global.btn.kembali.aria")}><Icon name="tutup" size={26} /></button>} />
        <main className="shell-main">
          <Card variant="key" awning data-testid="qr-card">
            <div className="stack center" style={{ gap: 12 }}>
              <b className="h2" style={{ fontSize: 22 }}>{shopName}</b>
              <div ref={box} className="qr-box" data-testid="qr-box"><QRCodeCanvas value={url} size={216} marginSize={2} /></div>
              {general ? <span className="small">{t("baru.qr.general.hint")}</span> : <span className="money-lg">{rupiah(BigInt(n) * 100n)}</span>}
              {!general && note && <span className="small">{note}</span>}
            </div>
          </Card>
          <div className="center" style={{ display: "flex" }}><Pill kind="wait" icon="waktu"><span data-testid="waiting">{t("terima.wait")}</span></Pill></div>
          <Card variant="tint"><div className="row" style={{ alignItems: "flex-start", gap: 10 }}><Icon name="peringatan" size={26} /><p className="p grow">{t("terima.notqris")}</p></div></Card>
          <div className="cta-bar">
            <Button icon="kecerahan" onClick={() => setFull(true)} data-testid="show-customer">{t("terima.btn.show")}</Button>
            <div className="row" style={{ gap: 10 }}>
              <Button kind="secondary" icon="bagikan" onClick={share}>{t("terima.btn.share")}</Button>
              <Button kind="secondary" icon="cetak" onClick={download}>{t("terima.btn.print")}</Button>
            </div>
            <Button kind="quiet" href="/toko/poster">{t("terima.link.poster")}</Button>
          </div>
        </main>
        {full && (
          <div ref={fsEl} role="dialog" aria-label={t("terima.full.title", { shop: shopName })} style={{ position: "fixed", inset: 0, zIndex: 80, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center" }}>
            <button className="iconbtn" style={{ position: "absolute", top: 12, right: 12 }} aria-label={t("global.btn.tutup.aria")} onClick={() => setFull(false)}><Icon name="tutup" size={28} /></button>
            <h2 className="h2">{t("terima.full.title", { shop: shopName })}</h2>
            <QRCodeCanvas value={url} size={Math.min(320, typeof window === "undefined" ? 320 : window.innerWidth - 64)} marginSize={2} />
            {!general && <span className="money-xl">{rupiah(BigInt(n) * 100n)}</span>}
            <span className="small">{t("terima.full.bright")}</span>
          </div>
        )}
      </>
    );
  }

  const ok = n >= minRp;
  return (
    <>
      <TopBar title={t("terima.title")} back="/toko" />
      <main className="shell-main" style={{ gap: 14 }}>
        <div className="seg" role="group">
          <button aria-pressed={!general} onClick={() => setGeneral(false)}>{t("baru.qr.fixed")}</button>
          <button aria-pressed={general} onClick={() => setGeneral(true)} data-testid="mode-general">{t("baru.qr.general")}</button>
        </div>
        {!general && <>
          <div className="stack" style={{ gap: 8 }}>
            <span className="h3">{t("terima.amount.label")}</span>
            <div className="input" data-testid="amount-display" aria-live="polite" style={{ font: "400 36px var(--k-font-display)", color: "var(--k-color-heading)" }}>Rp {dots(n)}</div>
            {n > 0 && !ok && <span className="err">{t("terima.amount.min")}</span>}
          </div>
          <div className="chips grid4">
            {[10000, 25000, 50000, 100000].map((v) => <button key={v} className="chipbtn" aria-pressed={n === v} onClick={() => setDigits(String(v))}>{dots(v)}</button>)}
          </div>
          <div className="row" style={{ gap: 10, border: "1.5px solid var(--k-color-border-strong)", borderRadius: 12, padding: "0 12px", background: "var(--k-color-surface)", minHeight: 52 }}>
            <Icon name="riwayat" size={22} />
            <input aria-label={t("terima.note.placeholder")} placeholder={t("terima.note.placeholder")} maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} style={{ border: 0, flex: 1, minHeight: 48, background: "transparent", outline: "none" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "<"].map((k) => (
              <button key={k} className="chipbtn" style={{ minHeight: 56, borderRadius: 14, font: "700 24px var(--k-font-body)", borderColor: "var(--k-color-border-strong)", background: k === "<" ? "var(--k-color-bg-sunk)" : undefined }} aria-label={k === "<" ? "Hapus" : k} onClick={() => press(k)}>{k === "<" ? <Icon name="kembali" size={24} /> : k}</button>
            ))}
          </div>
        </>}
        {general && <Card variant="soft"><p className="p">{t("baru.qr.general.hint")}</p></Card>}
        <div className="cta-bar">
          <Button icon="terima-bayar" disabled={!general && !ok} onClick={() => setMode("qr")} data-testid="make-qr">{t("terima.btn.qr")}</Button>
        </div>
      </main>
    </>
  );
}

export default function Page() {
  return <Gate>{({ viewer, shop, reload }) => <Terima address={viewer} shopName={shop.profile.name ?? "Toko saya"} minRp={Number(shop.params.minPayment / 100n)} onReceived={reload} />}</Gate>;
}
