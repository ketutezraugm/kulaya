"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { Address } from "viem";
import { BOT_API, rupiah } from "@/lib/web3";

type Received = { amount: bigint; cut: bigint; customerNo: number };

/**
 * Get-paid card: show a QR that opens the payment page, copy or download it, and see the payment arrive live.
 * Two modes: a fixed amount (the customer just confirms) or a general QR where the customer types the amount
 * (the one printed on the stall poster).
 */
export function QrCard({ address, minPayment, onReceived }: { address: Address; minPayment: bigint; onReceived?: () => void }) {
  const [general, setGeneral] = useState(false);
  const [amount, setAmount] = useState("50000");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [received, setReceived] = useState<Received | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const min = Number(minPayment / 100n);
  const n = Math.floor(Number(amount) || 0);
  const valid = general || n >= min;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = general ? `${origin}/pay/${address}` : `${origin}/pay/${address}?amount=${n}${note ? `&note=${encodeURIComponent(note.slice(0, 100))}` : ""}`;

  // Live "payment received": start from the chain's current block, then poll for newer sales of this shop.
  const watching = valid && !received;
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
          const hit = (r.sales as { amount: string; repaidCut: string; customerNo: number }[]).find((s) => want === null || BigInt(s.amount) === want);
          if (hit) { setReceived({ amount: BigInt(hit.amount), cut: BigInt(hit.repaidCut), customerNo: hit.customerNo }); onReceived?.(); return; }
        }
        cursor = String(r.head);
      } catch { /* a missed poll is fine, the next one catches up */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [watching, general, n, address, onReceived]);

  function download() {
    const c = canvas.current?.querySelector("canvas");
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = general ? "kulaya-qr-toko.png" : `kulaya-qr-${n}.png`;
    a.click();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  }

  return (
    <div className="card">
      <b>Get paid</b>
      <p className="sub" style={{ margin: "4px 0 8px" }}>Show this QR to a customer. Each payment becomes verified sales history for your credit.</p>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className={general ? "ghost chip-btn" : "chip-btn"} onClick={() => setGeneral(false)}>Fixed amount</button>
        <button className={general ? "chip-btn" : "ghost chip-btn"} onClick={() => setGeneral(true)}>Customer enters amount</button>
      </div>

      {received ? (
        <div className="card" style={{ background: "var(--chip)", margin: "8px 0" }} role="status">
          <b className="ok">Pembayaran diterima!</b>
          <p style={{ margin: "6px 0 0" }}>{rupiah(received.amount)} dari Pelanggan #{received.customerNo}.{received.cut > 0n && <> {rupiah(received.cut)} otomatis dipotong untuk cicilan.</>}</p>
          <button style={{ marginTop: 10 }} onClick={() => setReceived(null)}>Terima pembayaran lagi</button>
        </div>
      ) : (
        <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
          {!general && (
            <div style={{ flex: "1 1 160px" }}>
              <label style={{ marginTop: 0 }}>Amount (Rp)</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
              <div className="row" style={{ margin: "6px 0 0" }}>
                {[10000, 25000, 50000, 100000].map((v) => <button key={v} className="ghost chip-btn" onClick={() => setAmount(String(v))}>{rupiah(BigInt(v) * 100n)}</button>)}
              </div>
              <label>Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="e.g. bakso 2 porsi" />
            </div>
          )}
          <div style={{ textAlign: "center", flex: general ? "1 1 100%" : undefined }} ref={canvas}>
            {valid ? <QRCodeCanvas value={url} size={168} marginSize={2} /> : <div className="sub" style={{ width: 168 }}>Minimum payment is {rupiah(minPayment)}</div>}
            {general && <p className="sub" style={{ margin: "6px 0 0" }}>One QR for your stall: customers type the amount themselves.</p>}
            {valid && <p className="sub" style={{ margin: "6px 0 0", fontSize: 13 }}>Menunggu pembayaran…</p>}
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={download} disabled={!valid}>Download QR</button>
        <button className="ghost" onClick={copy} disabled={!valid}>{copied ? "Copied" : "Copy link"}</button>
        <a className="btn ghost-link" href={url} target="_blank" rel="noreferrer">Preview</a>
      </div>
      <p className="sub" style={{ margin: "8px 0 0", fontSize: 13 }}>Customers pay in a stablecoin from a crypto wallet, with no gas. This is not QRIS, so OVO and GoPay can't scan it yet.</p>
    </div>
  );
}
