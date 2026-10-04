import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import * as icons from "@/components/art/icon";

/** Inline SVG (never <img>) so page fonts apply to <text> in the art. */
export function Art({ svg, w, className = "", style }: { svg: string; w?: number | string; className?: string; style?: CSSProperties }) {
  return <span className={`art ${className}`} style={{ width: w, ...style }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

const iconMap = icons as Record<string, string>;
const camel = (n: string) => "icon" + n.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
export type IconName = "aman" | "bagikan" | "bahasa" | "bantuan" | "beranda" | "biaya" | "cetak" | "cicilan" | "dompet" | "gagal" | "info" | "kalender" | "kecerahan" | "keluar" | "kembali" | "kirim-chat" | "kode" | "koneksi" | "konfirmasi" | "lanjut" | "level" | "lunas" | "menunggu" | "modal" | "pelanggan" | "pengaturan" | "penjualan" | "peringatan" | "pesan-suara" | "refresh" | "riwayat" | "salin-alamat" | "salin" | "tanpa-jaminan" | "tanpa-penagih" | "tanya" | "tautan-luar" | "telegram" | "terima-bayar" | "tutup" | "unduh" | "verifikasi" | "waktu";
export function Icon({ name, size = 24, inv = false }: { name: IconName; size?: number; inv?: boolean }) {
  return <span className={`icon${inv ? " inv" : ""}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: iconMap[camel(name)] }} />;
}

type BtnKind = "primary" | "accent" | "secondary" | "quiet" | "danger";
type BtnProps = { kind?: BtnKind; icon?: IconName; href?: string; external?: boolean; inline?: boolean; sm?: boolean; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;
export function Button({ kind = "primary", icon, href, external, inline, sm, children, className = "", ...rest }: BtnProps) {
  const cls = `btn ${kind === "primary" ? "" : kind} ${inline ? "inline" : ""} ${sm ? "sm" : ""} ${className}`;
  const inner = <>{icon && <Icon name={icon} size={24} inv={kind === "primary"} />}<span>{children}</span></>;
  const tid = (rest as Record<string, string>)["data-testid"];
  if (href) return external ? <a className={cls} href={href} target="_blank" rel="noreferrer" data-testid={tid}>{inner}</a> : <Link className={cls} href={href} data-testid={tid} onClick={rest.onClick as never}>{inner}</Link>;
  return <button className={cls} {...rest}>{inner}</button>;
}

export function Pill({ kind, icon, children }: { kind: "ok" | "wait" | "bad" | "info" | "accent"; icon?: IconName; children: ReactNode }) {
  const def: Record<string, IconName> = { ok: "lunas", wait: "menunggu", bad: "gagal", info: "aman", accent: "level" };
  return <span className={`pill ${kind}`}><Icon name={icon ?? def[kind]} size={20} />{children}</span>;
}

export function Card({ children, variant = "", awning = false, className = "", pad = true, ...rest }: { children: ReactNode; variant?: "" | "key" | "soft" | "tint" | "dark"; awning?: boolean; className?: string; pad?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${variant} ${className}`} {...rest}>{awning && <div className="awning-edge" />}{pad ? <div className="card-in">{children}</div> : children}</div>;
}

export function Nota({ children }: { children: ReactNode }) {
  return <div className="nota"><div className="nota-in">{children}</div></div>;
}

export function Row({ a, b, className = "" }: { a: ReactNode; b: ReactNode; className?: string }) {
  return <div className={`kv ${className}`}><span>{a}</span><span>{b}</span></div>;
}

export function Progress({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${v}%` }} /></div>;
}

export function Steps({ n, of }: { n: number; of: number }) {
  return <div className="steps"><b>Langkah {n} dari {of}</b><div>{Array.from({ length: of }, (_, i) => <i key={i} className={i < n ? "on" : ""} />)}</div></div>;
}

export function Check({ ok, title, sub }: { ok: boolean; title: ReactNode; sub?: ReactNode }) {
  return <div className="check"><Icon name={ok ? "lunas" : "menunggu"} size={28} /><div><b>{title}</b>{sub && <small className={ok ? "ok-t" : "warn-t"}>{sub}</small>}</div></div>;
}

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/** Skeleton block for loading states. */
export const Skel = ({ h = 24, w = "100%" }: { h?: number; w?: number | string }) => <div className="skeleton" style={{ height: h, width: w }} />;
