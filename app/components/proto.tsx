"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Art, Icon, type IconName } from "@/components/ui";
import { BOT_API, EXPLORER, rupiah } from "@/lib/web3";

export const REPO = "https://github.com/ketutezraugm/kulaya";
export const trunc = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
/** "Rp 1,8 jt" for big numbers, full rupiah below a million */
export const jt = (units: bigint | number | string) => {
  const rp = Number(BigInt(units) / 100n);
  return rp >= 1_000_000 ? "Rp " + (Math.round(rp / 100_000) / 10).toString().replace(".", ",") + " jt" : rupiah(BigInt(units));
};

export type AgentApi = {
  agentId: number; agentAddress: string; warung: string; reputation: { count: number; average: number } | null;
  pool: { assets: string; loanedOut: string; reserve: string };
  stats: { shops: number; loansProposed: number; loansActive: number; loansRepaid: number; loansDefaulted: number };
  caps: Record<string, string | number>;
};

/** Live numbers from /api/agent (also drives the keeper that reports closed loans). */
export function useAgent() {
  const [data, setData] = useState<AgentApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    fetch(`${BOT_API}/agent`).then(async (r) => { if (!r.ok) throw new Error(String(r.status)); setData(await r.json()); }).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(load, [load]);
  return { data, error, retry: load };
}

export function PHead({ route, title, lead, art, artW = 150 }: { route: string; title: string; lead?: ReactNode; art?: string; artW?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 32, alignItems: "end" }}>
      <div className="stack" style={{ gap: 10 }}>
        <span className="route">{route}</span>
        <h1>{title}</h1>
        {lead && <p className="p-lead">{lead}</p>}
      </div>
      {art && <div className="p-art hide-sm"><Art svg={art} w={artW} /></div>}
    </div>
  );
}

export function Sec({ n, title, children, id }: { n?: string; title: string; children: ReactNode; id?: string }) {
  return <section className="p-sec" id={id}><h2>{n && <small>{n}</small>}{title}</h2>{children}</section>;
}

export function Stat({ label, value, sub, testid }: { label: string; value: ReactNode; sub?: ReactNode; testid?: string }) {
  return <div className="p-stat" data-testid={testid}><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
}

export function Tag({ kind, children, icon }: { kind: "pass" | "block" | "warn" | "skip" | "info"; children: ReactNode; icon?: IconName }) {
  const i: Record<string, IconName> = { pass: "lunas", block: "gagal", warn: "peringatan", skip: "waktu", info: "info" };
  return <span className={`p-tagpill ${kind}`}><Icon name={icon ?? i[kind]} size={16} />{children}</span>;
}

export function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard blocked */ } }} aria-label={`${label} ${text.slice(0, 20)}`} title={label}>
      <Icon name="salin" size={16} />{done ? "Copied" : ""}
    </button>
  );
}

/** Address: truncated in mono, full value in title + clipboard, BscScan link. */
export function Addr({ a, kind = "address" }: { a: string; kind?: "address" | "tx" }) {
  return (
    <span className="p-addr" title={a}>
      <code>{trunc(a)}</code>
      <CopyBtn text={a} />
      <a href={`${EXPLORER}/${kind}/${a}`} target="_blank" rel="noreferrer"><Icon name="verifikasi" size={16} />BscScan</a>
    </span>
  );
}

export function Code({ title, text }: { title: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="p-code">
      <div><span>{title}</span><button onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* ignore */ } }}><Icon name="salin" size={16} />{done ? "Copied" : "Copy"}</button></div>
      <pre>{text}</pre>
    </div>
  );
}

export function PLink({ href, children, kind = "secondary", external }: { href: string; children: ReactNode; kind?: "" | "accent" | "secondary" | "quiet"; external?: boolean }) {
  const c = `p-btn ${kind}`;
  return external ? <a className={c} href={href} target="_blank" rel="noreferrer">{children}</a> : <Link className={c} href={href}>{children}</Link>;
}

export function ApiError({ code, retry }: { code: string; retry: () => void }) {
  return (
    <div className="p-card warm" role="alert" data-testid="api-error">
      <Tag kind="warn">API ERROR · {code}</Tag>
      <h3>Live numbers are unavailable right now.</h3>
      <p>The contracts are unaffected. You can still verify everything directly on BscScan.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="p-btn" onClick={retry}>Retry</button>
        <PLink href={`${EXPLORER}/address/0xF6fD0727D20eD76442BfD16727fA4ce1482321D8`} external>Open Warung.sol on BscScan</PLink>
      </div>
    </div>
  );
}
