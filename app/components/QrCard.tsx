"use client";
import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { Address } from "viem";
import { rupiah } from "@/lib/web3";

/** Get-paid card: pick an amount, show a QR that opens the payment page, copy or download it. */
export function QrCard({ address, minPayment }: { address: Address; minPayment: bigint }) {
  const [amount, setAmount] = useState("50000");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const min = Number(minPayment / 100n);
  const n = Math.floor(Number(amount) || 0);
  const valid = n >= min;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/pay/${address}?amount=${n}${note ? `&note=${encodeURIComponent(note.slice(0, 100))}` : ""}`;

  function download() {
    const c = canvas.current?.querySelector("canvas");
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `warung-qr-${n}.png`;
    a.click();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  }

  return (
    <div className="card">
      <b>Get paid</b>
      <p className="sub" style={{ margin: "4px 0 8px" }}>Show this QR to a customer. Each payment becomes verified sales history for your credit.</p>
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px" }}>
          <label style={{ marginTop: 0 }}>Amount (Rp)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          <div className="row" style={{ margin: "6px 0 0" }}>
            {[10000, 25000, 50000, 100000].map((v) => <button key={v} className="ghost chip-btn" onClick={() => setAmount(String(v))}>{rupiah(BigInt(v) * 100n)}</button>)}
          </div>
          <label>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="e.g. bakso 2 porsi" />
        </div>
        <div style={{ textAlign: "center" }} ref={canvas}>
          {valid ? <QRCodeCanvas value={url} size={168} marginSize={2} /> : <div className="sub" style={{ width: 168 }}>Minimum payment is {rupiah(minPayment)}</div>}
        </div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={download} disabled={!valid}>Download QR</button>
        <button className="ghost" onClick={copy} disabled={!valid}>{copied ? "Copied" : "Copy link"}</button>
        <a className="btn ghost-link" href={url} target="_blank" rel="noreferrer">Preview</a>
      </div>
      <p className="sub" style={{ margin: "8px 0 0", fontSize: 13 }}>Customers pay in a stablecoin from a crypto wallet, with no gas. This is not QRIS, so OVO and GoPay can't scan it yet.</p>
    </div>
  );
}
