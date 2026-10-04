"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Address } from "viem";
import { Art, Button, Card, Icon, Pill, Skel } from "@/components/ui";
import * as logo from "@/components/art/logo";
import * as scene from "@/components/art/scene";
import * as stall from "@/components/art/stall";
import { LEVELS } from "@/lib/capital";
import { t } from "@/lib/copy";
import { dayLabel } from "@/lib/shop";
import { BOT_API, EXPLORER, WARUNG, rupiah, short, warungRead } from "@/lib/web3";

const STALLS = [stall.illStallPerintis, stall.illStallBerkembang, stall.illStallMaju, stall.illStallUnggul];

type D = { name: string | null; tier: number; payers: number; trailing: bigint; days: { epoch: bigint; v: bigint }[]; epochLen: bigint; repaid: number };

export default function Profil({ params }: { params: Promise<{ toko: string }> }) {
  const merchant = use(params).toko as Address;
  const [d, setD] = useState<D | null>(null);
  const [notShop, setNotShop] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const [m, p, epoch, trailing] = await Promise.all([warungRead("merchants", [merchant]), warungRead("p"), warungRead("currentEpoch"), warungRead("trailingRevenue", [merchant])]);
      if (!m[0]) { setNotShop(true); return; }
      const days = await Promise.all(Array.from({ length: 30 }, (_, i) => warungRead("epochRevenue", [merchant, epoch - BigInt(29 - i)]).then((v: bigint) => ({ epoch: epoch - BigInt(29 - i), v }))));
      const prof = await fetch(`${BOT_API}/profile?merchant=${merchant}`).then((r) => r.json()).catch(() => ({ name: null }));
      const loans = await fetch(`${BOT_API}/loans?merchant=${merchant}`).then((r) => r.json()).then((j) => j.loans ?? []).catch(() => []);
      setD({ name: prof.name ?? null, tier: m[2], payers: m[3], trailing, days, epochLen: p[0], repaid: loans.filter((l: { derived: string }) => l.derived === "Repaid").length });
    })().catch((e) => setErr(e.message.split("\n")[0]));
  }, [merchant]);

  const share = async () => {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ url, title: d?.name ?? "Kulaya" }); else await navigator.clipboard.writeText(url); } catch { /* cancelled */ }
  };

  if (notShop) return <main className="shell-main"><div className="stack-lg center"><Art svg={scene.illShutterClosed} w={240} /><h1 className="h2">{t("baru.notreg")}</h1><Button href="/" kind="secondary">{t("baru.back.home")}</Button></div></main>;
  if (err) return <main className="shell-main"><p className="err">{err}</p></main>;
  if (!d) return <main className="shell-main" aria-busy="true"><Skel h={180} /><Skel h={120} /></main>;
  const max = d.days.reduce((a, x) => (x.v > a ? x.v : a), 1n);
  const level = LEVELS[Math.min(3, d.tier)];

  return (
    <main className="shell-main" style={{ gap: 18 }}>
      <header className="row between" style={{ paddingTop: 12 }}><Link href="/"><Art svg={logo.logoLockup} w={104} /></Link></header>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="stack">
          <h1 className="h1" data-testid="profile-name">{d.name ?? short(merchant)}</h1>
          <Pill kind="accent" icon="level">{level}</Pill>
          {d.repaid > 0 && <Pill kind="ok">{t("profil.repaid", { n: d.repaid })}</Pill>}
        </div>
        <Art svg={STALLS[Math.min(3, d.tier)]} w={116} />
      </div>
      <Card variant="key" awning>
        <span className="label">{t("riwayat.tot.30")}</span>
        <span className="money-xl">{rupiah(d.trailing)}</span>
        <span className="row" style={{ gap: 8 }}><Icon name="pelanggan" size={24} /><b className="num">{d.payers}</b> {t("profil.payers")}</span>
      </Card>
      <Card>
        <span className="h3">{t("profil.chart")}</span>
        <div className="bars" role="img" aria-label={t("profil.chart")}>{d.days.map((x, i) => <i key={String(x.epoch)} className={i === 29 ? "today" : ""} title={`${dayLabel(x.epoch, d.epochLen)}: ${rupiah(x.v)}`} style={{ height: `${Math.max(2, Number((x.v * 100n) / max))}%` }} />)}</div>
        <div className="bar-labels"><span>{t("riwayat.chart.start")}</span><span>{t("riwayat.chart.today")}</span></div>
      </Card>
      <Card variant="tint"><div className="row" style={{ alignItems: "flex-start", gap: 10 }}><Icon name="aman" size={26} /><p className="p grow">{t("profil.trust")}</p></div><a href={`${EXPLORER}/address/${WARUNG}`} target="_blank" rel="noreferrer" lang="en">BscScan</a></Card>
      <Button kind="secondary" icon="bagikan" onClick={share}>{t("profil.share")}</Button>
    </main>
  );
}
