"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import * as motif from "@/components/art/motif";
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
