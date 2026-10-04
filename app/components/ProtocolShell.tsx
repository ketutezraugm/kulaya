"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as logo from "@/components/art/logo";
import { Art, Icon, type IconName } from "@/components/ui";
import { EXPLORER, WARUNG } from "@/lib/web3";

const REPO = "https://github.com/ketutezraugm/kulaya";
const NAV: [IconName, string, string][] = [["beranda", "Overview", "/protocol"], ["peringatan", "Red-team console", "/protocol/redteam"], ["tanya", "AI agent", "/protocol/agent"], ["modal", "Lending pool", "/protocol/pool"], ["verifikasi", "Contracts", "/protocol/contracts"], ["konfirmasi", "Gasless & relayer", "/protocol/gasless"], ["kode", "Run it yourself", "/protocol/docs"]];
const THEME = "kulaya_protocol_theme";

/** English judge/developer site: top bar, sticky 248px sidebar (a Menu button below 900px), light/dark. */
export function ProtocolShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => { try { setDark(localStorage.getItem(THEME) === "dark"); } catch { /* ignore */ } }, []);
  useEffect(() => setMenu(false), [path]);
  const toggle = () => { setDark((d) => { try { localStorage.setItem(THEME, d ? "light" : "dark"); } catch { /* ignore */ } return !d; }); };
  const nav = (
    <nav className="p-nav" aria-label="Documentation">
      <span className="p-eyebrow">DOCUMENTATION</span>
      {NAV.map(([i, label, href]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><Icon name={i} size={18} />{label}</Link>
      ))}
      <a href={REPO} target="_blank" rel="noreferrer"><Icon name="tautan-luar" size={18} />GitHub</a>
      <Link href="/" lang="id"><Icon name="beranda" size={18} />Owner app (Bahasa)</Link>
      <div className="p-note"><b>Testnet prototype</b><span>Mock IDRX, test money only. Not QRIS.</span></div>
    </nav>
  );
  return (
    <div data-site="protocol" data-theme={dark ? "dark" : "light"} className="p-root" lang="en">
      <header className="p-top">
        <div className="awning-edge strong" style={{ height: 10, backgroundSize: "13px 10px" }} />
        <div className="p-top-in">
          <Link href="/protocol" className="row" style={{ gap: 10, textDecoration: "none" }}><Art svg={logo.logoLockup} w={108} /><span className="p-tag">Protocol</span></Link>
          <button className="p-menu" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="beranda" size={18} />Menu</button>
          <span className="grow" />
          <a className="p-link hide-sm" href={REPO} target="_blank" rel="noreferrer"><Icon name="kode" size={18} />GitHub</a>
          <a className="p-link hide-sm" href={`${EXPLORER}/address/${WARUNG}`} target="_blank" rel="noreferrer"><Icon name="tautan-luar" size={18} />BscScan</a>
          <Link className="p-link hide-sm" href="/" lang="id" style={{ fontWeight: 700, color: "var(--k-color-link)" }}>Open the shop owner app (Bahasa)<Icon name="lanjut" size={16} /></Link>
          <span className="p-chain hide-sm"><i />BNB Smart Chain Testnet · 97</span>
          <button className="p-theme" onClick={toggle} aria-label="Toggle dark mode"><Icon name="kecerahan" size={18} /></button>
        </div>
      </header>
      <div className="p-body">
        <aside className="p-side">{nav}</aside>
        <main className="p-main">{children}</main>
      </div>
      {menu && (
        <div className="p-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="p-close" onClick={() => setMenu(false)} aria-label="Close menu"><Icon name="tutup" size={22} />Close</button>
          {nav}
        </div>
      )}
    </div>
  );
}
