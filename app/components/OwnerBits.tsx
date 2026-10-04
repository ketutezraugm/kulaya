"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as motif from "@/components/art/motif";
import * as scene from "@/components/art/scene";
import * as mascot from "@/components/art/mascot";
import { Art, Icon, type IconName } from "@/components/ui";
import { t } from "@/lib/copy";

export function TestBanner() {
  return (
    <div className="banner" role="note">
      <Art svg={motif.stampUjiCoba} w={28} />
      <span>{t("global.banner.text")}</span>
      <Link href="/bantuan#uji-coba">{t("global.banner.link")}</Link>
    </div>
  );
}

const TABS: [IconName, string, string][] = [["beranda", t("global.nav.beranda"), "/toko"], ["terima-bayar", t("global.nav.terima"), "/toko/terima"], ["modal", t("global.nav.modal"), "/toko/modal"], ["bantuan", t("global.nav.bantuan"), "/bantuan"]];

export function TabBar() {
  const path = usePathname();
  const on = (h: string) => (h === "/toko" ? path === "/toko" || path.startsWith("/toko/riwayat") || path.startsWith("/toko/tanya") : path.startsWith(h));
  return (
    <nav className="tabbar" aria-label="Menu utama">
      {TABS.map(([i, label, href]) => (
        <Link key={href} href={href} aria-current={on(href) ? "page" : undefined}><Icon name={i} size={28} />{label}</Link>
      ))}
    </nav>
  );
}

/** Title bar with a back button. `back` is a fixed target; without it the browser history is used. */
export function TopBar({ title, back, right }: { title: string; back?: string | false; right?: ReactNode }) {
  const r = useRouter();
  return (
    <div className="topbar">
      {back === false ? <span style={{ width: 8 }} /> : back ? (
        <Link className="iconbtn" href={back} aria-label={t("global.btn.kembali.aria")}><Icon name="kembali" size={26} /></Link>
      ) : (
        <button className="iconbtn" onClick={() => r.back()} aria-label={t("global.btn.kembali.aria")}><Icon name="kembali" size={26} /></button>
      )}
      <h1>{title}</h1>
      {right}
    </div>
  );
}

/** Shown instead of a broken page when the phone has no connection; the page reloads itself when it comes back. */
export function OfflineNotice() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    setOff(!navigator.onLine);
    const on = () => { setOff(false); location.reload(); }, down = () => setOff(true);
    window.addEventListener("online", on); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", down); };
  }, []);
  if (!off) return null;
  return (
    <div role="alert" data-testid="offline" style={{ position: "fixed", inset: 0, zIndex: 90, background: "var(--k-color-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <Art svg={scene.illStateSlow} w={240} />
      <h1 className="h2">{t("err.offline.title")}</h1>
      <p className="p">{t("err.offline.body")}</p>
    </div>
  );
}

type InstallEvent = Event & { prompt(): Promise<void> };
/** "Add to home screen" card (Chrome/Android). No service worker is needed for the browser to offer it. */
export function InstallCard() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem("kulaya_install_later") === "1") setHidden(true); } catch { /* ignore */ }
    const h = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!ev || hidden) return null;
  return (
    <div className="card tint" data-testid="install-card"><div className="card-in">
      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}><Art svg={mascot.mascotPoint} w={56} /><div className="stack" style={{ gap: 4 }}><b>{t("beranda.pwa.title")}</b><p className="p">{t("beranda.pwa.body")}</p></div></div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn quiet sm" onClick={() => { setHidden(true); try { localStorage.setItem("kulaya_install_later", "1"); } catch { /* ignore */ } }}>{t("beranda.pwa.later")}</button>
        <button className="btn sm" onClick={async () => { await ev.prompt(); setHidden(true); }}>{t("beranda.pwa.add")}</button>
      </div>
    </div></div>
  );
}
