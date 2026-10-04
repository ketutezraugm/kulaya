"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Gate } from "@/components/Gate";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button } from "@/components/ui";
import * as logo from "@/components/art/logo";
import * as motif from "@/components/art/motif";
import * as scene from "@/components/art/scene";
import { t } from "@/lib/copy";

const PICTOS = [scene.picto1Scan, scene.picto2Confirm, scene.picto3Done];

/** A5 poster at true size. Page 1 in colour, page 2 black and white (copier friendly). The QR is the shop's general link: the customer types the amount. */
function Poster({ mono, shop, url }: { mono: boolean; shop: string; url: string }) {
  const ink = mono ? "#000" : "#1E2A5A";
  return (
    <section className={`poster ${mono ? "mono" : ""}`} style={{ background: mono ? "#fff" : "#FBF7EF", fontFamily: "var(--k-font-body)" }}>
      <div style={{ height: "9mm", flex: "none", backgroundImage: `url(/art/motif/motif-awning-tile${mono ? "-mono" : ""}.svg)`, backgroundSize: "12mm 9mm", backgroundRepeat: "repeat-x", borderBottom: mono ? 0 : "0.4mm solid #1E2A5A" }} />
      <div style={{ flex: 1, margin: "4mm", border: `0.6mm solid ${ink}`, borderRadius: "4mm", padding: "3mm", backgroundColor: mono ? "#fff" : "#FBF7EF", backgroundImage: `url(/art/motif/pattern-kawung${mono ? "-mono" : "-faint"}.svg)`, backgroundSize: "9mm 9mm", display: "flex" }}>
        <div style={{ flex: 1, background: "#fff", border: `0.4mm solid ${ink}`, borderRadius: "2.5mm", padding: "6mm 7mm 5mm", display: "flex", flexDirection: "column", alignItems: "center", gap: "3.6mm" }}>
          <Art svg={mono ? logo.logoLockupMonoDark : logo.logoLockup} w="32mm" style={mono ? { filter: "brightness(0)" } : undefined} />
          <span style={{ font: "400 9.6mm/1.05 var(--k-font-display)", color: ink, textAlign: "center", textWrap: "balance" }}>{t("poster.title")}</span>
          <span style={{ font: "700 5.4mm/1.2 var(--k-font-body)", color: ink, textAlign: "center", borderTop: `0.4mm dashed ${ink}`, borderBottom: `0.4mm dashed ${ink}`, padding: "1.6mm 4mm", alignSelf: "stretch" }}>{shop}</span>
          <div style={{ width: "72mm", height: "72mm", padding: "3mm", border: `0.8mm solid ${ink}`, borderRadius: "3mm", background: "#fff", boxShadow: mono ? "none" : "1.4mm 1.4mm 0 #F2B33D", display: "flex", lineHeight: 0 }}>
            <QRCodeSVG value={url} size={256} marginSize={0} style={{ width: "100%", height: "100%" }} />
          </div>
          <div style={{ display: "flex", gap: "4mm", alignSelf: "stretch", paddingTop: "1mm" }}>
            {PICTOS.map((svg, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5mm", textAlign: "center" }}>
                <div style={{ width: "20mm", height: "20mm", border: `0.5mm solid ${ink}`, borderRadius: "4mm", background: mono ? "#fff" : "#FDF1D6", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <Art svg={svg} w="86%" style={mono ? { filter: "grayscale(1) contrast(1.6)" } : undefined} />
                  <span style={{ position: "absolute", top: "-2.6mm", left: "-2.6mm", width: "6mm", height: "6mm", borderRadius: "50%", background: ink, color: mono ? "#fff" : "#F2B33D", display: "flex", alignItems: "center", justifyContent: "center", font: "400 3.6mm/1 var(--k-font-display)" }}>{i + 1}</span>
                </div>
                <span style={{ font: "700 3.3mm/1.25 var(--k-font-body)", color: ink }}>{t(`poster.step.${i + 1}` as never)}</span>
              </div>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "2mm", alignSelf: "stretch", borderTop: `0.3mm solid ${ink}`, paddingTop: "2.4mm" }}>
            <Art svg={motif.stampUjiCoba} w="9mm" />
            <span style={{ font: "400 2.9mm/1.4 var(--k-font-body)", color: ink }}>{t("poster.note")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PosterPage() {
  const [which, setWhich] = useState<"color" | "mono">("color");
  return (
    <Gate>
      {({ viewer, shop }) => {
        const url = `${window.location.origin}/bayar/${viewer}`;
        const name = shop.profile.name ?? "Toko saya";
        return (
          <>
            <div className="no-print"><TopBar title="Poster QR" back="/toko/terima" /></div>
            <main className="shell-main poster-main">
              <div className="seg no-print" role="group">
                <button aria-pressed={which === "color"} onClick={() => setWhich("color")}>Warna</button>
                <button aria-pressed={which === "mono"} onClick={() => setWhich("mono")}>Hitam-putih</button>
              </div>
              <div className={`poster-view ${which}`}><Poster mono={which === "mono"} shop={name} url={url} /></div>
              <div className="cta-bar no-print"><Button icon="cetak" onClick={() => window.print()} data-testid="print-poster">{t("terima.btn.print")}</Button></div>
            </main>
          </>
        );
      }}
    </Gate>
  );
}
