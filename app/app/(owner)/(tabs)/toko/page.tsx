"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Gate } from "@/components/Gate";
import { InstallCard } from "@/components/OwnerBits";
import { NameSheet } from "@/components/NameSheet";
import { Art, Button, Card, Icon, Nota, Pill, Progress } from "@/components/ui";
import * as mascot from "@/components/art/mascot";
import * as motif from "@/components/art/motif";
import * as stall from "@/components/art/stall";
import { LEVELS, capitalState, greeting, whenId } from "@/lib/capital";
import { t } from "@/lib/copy";
import { dayLabel, sumUnits } from "@/lib/shop";
import { rupiah, rupiahFriendly } from "@/lib/web3";

const STALLS = [stall.illStallPerintis, stall.illStallBerkembang, stall.illStallMaju, stall.illStallUnggul];
const BADGES = [stall.badgeLevelPerintis, stall.badgeLevelBerkembang, stall.badgeLevelMaju, stall.badgeLevelUnggul];
const JARS = [motif.jar0, motif.jar25, motif.jar50, motif.jar75, motif.jar100];
const TIP_KEY = "kulaya_tip_hidden";

export default function Beranda() {
  const [edit, setEdit] = useState(false);
  const [tip, setTip] = useState(true);
  useEffect(() => { try { setTip(sessionStorage.getItem(TIP_KEY) !== "1"); } catch { /* ignore */ } }, []);
  return (
    <Gate>
      {({ shop, viewer, wallet, reload }) => {
        const p = shop.params;
        const today = shop.days[29].v, yesterday = shop.days[28].v;
        const todayN = shop.sales.filter((s) => BigInt(s.epoch) === shop.epoch).length;
        const cap = capitalState(shop);
        const level = LEVELS[Math.min(3, shop.tier)];
        const who = shop.profile.nickname || shop.profile.name || "";
        const tierCeiling = p.baseTierMax << BigInt(shop.tier);
        const l = shop.loan;
        return (
          <>
            <main className="shell-main" style={{ gap: 18 }}>
              <header className="row between" style={{ alignItems: "flex-start", paddingTop: 12 }}>
                <div className="stack" style={{ gap: 6 }}>
                  <span className="row label" style={{ gap: 8 }}><Icon name="kecerahan" size={22} />{t(`beranda.greet.${greeting()}` as never)}</span>
                  <h1 className="h1" data-testid="greeting-name">{who || t("baru.tg.hello")}</h1>
                  {shop.profile.name && who !== shop.profile.name && <span style={{ fontWeight: 700 }}>{shop.profile.name}</span>}
                  <Pill kind="accent" icon="level">{level}</Pill>
                </div>
                <div className="row" style={{ gap: 4, alignItems: "flex-start" }}>
                  <Art svg={STALLS[Math.min(3, shop.tier)]} w={108} />
                  <button className="iconbtn" style={{ border: "1.5px solid var(--k-color-border)", background: "var(--k-color-surface)" }} aria-label={t("baru.name.edit")} data-testid="open-edit" onClick={() => setEdit(true)}><Icon name="pengaturan" size={24} /></button>
                </div>
              </header>

              <Card variant="key" awning data-testid="sales-card">
                <div className="row between"><span className="lead">{t("beranda.sales.label")}</span><Pill kind="ok" icon="penjualan">{t("beranda.sales.count", { n: todayN })}</Pill></div>
                <span className="money-xl">{rupiah(today)}</span>
                <span className="lead">{t("beranda.sales.yesterday", { rp: "" })}<b className="num">{rupiah(yesterday)}</b></span>
                <span className="lead">{t("beranda.sales.30d", { rp: "" })}<b className="num">{rupiah(shop.trailing)}</b></span>
              </Card>

              <Card variant={cap.kind === "def" ? "" : "soft"} data-testid={`capital-${cap.kind}`}>
                {cap.kind === "not" && <>
                  <span className="h3">{t("beranda.cap.label")}</span>
                  <p className="p">{t("beranda.cap.not.body", { n: cap.payersLeft })}</p>
                  <Progress pct={(shop.payers / p.minPayers) * 100} />
                  <span className="small">{t("beranda.cap.not.progress", { x: shop.payers })}</span>
                  <Button kind="secondary" href="/toko/terima">{t("beranda.cap.not.btn")}</Button>
                </>}
                {cap.kind === "low" && <><span className="h3">{t("beranda.cap.label")}</span><p className="p">{t("baru.cap.low", { rp: rupiah(shop.creditLimit) })}</p><Button kind="secondary" href="/toko/terima">{t("beranda.cap.not.btn")}</Button></>}
                {cap.kind === "ok" && <>
                  <div className="row between" style={{ alignItems: "flex-start" }}>
                    <div className="stack" style={{ gap: 6 }}>
                      <span className="h3">{t("beranda.cap.label")}</span>
                      <p className="lead">{t("beranda.cap.ok.body")}</p>
                      <span className="money-lg" data-testid="cap-limit">{rupiahFriendly(shop.creditLimit)}</span>
                      <span className="small">{t("beranda.cap.ok.exact", { rp: rupiah(shop.creditLimit) })}</span>
                    </div>
                    <Art svg={JARS[Math.min(4, Number((shop.creditLimit * 4n) / (tierCeiling || 1n)))]} w={84} />
                  </div>
                  <Button kind="secondary" icon="lanjut" href="/toko/modal">{t("beranda.cap.ok.btn")}</Button>
                </>}
                {cap.kind === "offer" && <>
                  <Pill kind="wait">{t("beranda.cap.offer.pill")}</Pill>
                  <h2 className="h2">{t("beranda.cap.offer.title")}</h2>
                  <span className="money-lg">{rupiah(l!.principal)}</span>
                  <span className="small">{t("beranda.cap.offer.until", { when: whenId(cap.expiresAt) })}</span>
                  <Button kind="accent" href="/toko/modal">{t("beranda.cap.offer.btn")}</Button>
                </>}
                {cap.kind === "active" && <>
                  <span className="h3">{t("beranda.cap.active.label")}</span>
                  <p className="lead">{t("beranda.cap.active.body", { pct: cap.pct })}</p>
                  <Progress pct={cap.pct} />
                  <span className="small">{t("beranda.cap.active.rest", { rp: rupiah(l!.total - l!.repaid), x: l!.repayBps / 100 })}</span>
                  <Button kind="secondary" href="/toko/modal">{t("beranda.cap.active.btn")}</Button>
                </>}
                {cap.kind === "repaid" && <>
                  <div className="row between" style={{ alignItems: "flex-start" }}>
                    <div className="stack">
                      <Pill kind="ok">{t("beranda.cap.repaid.pill")}</Pill>
                      <h2 className="h2">{t("beranda.cap.repaid.title", { level })}</h2>
                      <p className="p">{t("beranda.cap.repaid.body", { rp: rupiah(tierCeiling) })}</p>
                    </div>
                    <Art svg={BADGES[Math.min(3, shop.tier)]} w={72} />
                  </div>
                  <Button kind="secondary" href="/toko/modal">{t("beranda.cap.repaid.btn")}</Button>
                </>}
                {cap.kind === "def" && <>
                  <Pill kind="wait" icon="peringatan">{t("beranda.cap.def.pill")}</Pill>
                  <p className="p">{t("beranda.cap.def.body")}</p>
                  <p className="small">{t("beranda.cap.def.sub")}</p>
                  <Button kind="secondary" href="/bantuan#modal">{t("beranda.cap.def.btn")}</Button>
                </>}
              </Card>

              <Link href="/toko/tanya" className="card dark" style={{ textDecoration: "none", color: "#fff" }} data-testid="open-tanya">
                <div className="card-in" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Art svg={mascot.mascotGreet} w={64} />
                  <div className="grow stack" style={{ gap: 2 }}><b style={{ fontSize: 20 }}>{t("beranda.tanya.title")}</b><span style={{ fontSize: 16 }}>{t("beranda.tanya.sub")}</span></div>
                  <Icon name="lanjut" size={26} inv />
                </div>
              </Link>

              <section className="stack">
                <div className="row between"><h2 className="h3" style={{ fontSize: 22 }}>{t("beranda.recent.title")}</h2><Link href="/toko/riwayat">{t("beranda.recent.all")}</Link></div>
                {shop.sales.length === 0 ? <p className="small">{t("riwayat.empty.body")}</p> : (
                  <Nota>
                    {shop.sales.slice(0, 3).map((s) => (
                      <div className="nota-row" key={s.tx}>
                        <div><b>{s.memo || "Pembayaran"}</b><small>{dayLabel(BigInt(s.epoch), p.epochLength)} · {t("riwayat.customer", { n: s.customerNo })}</small></div>
                        <span className="amt">{rupiah(BigInt(s.amount))}</span>
                      </div>
                    ))}
                  </Nota>
                )}
              </section>

              {tip && (
                <Card variant="tint">
                  <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
                    <Icon name="info" size={28} />
                    <div className="grow stack" style={{ gap: 4 }}><b>{t("beranda.tip.title")}</b><p className="p">{t("beranda.tip.1")}</p></div>
                    <button className="iconbtn" style={{ margin: "-10px -10px 0 0" }} aria-label={t("global.btn.tutup.aria")} onClick={() => { setTip(false); try { sessionStorage.setItem(TIP_KEY, "1"); } catch { /* ignore */ } }}><Icon name="tutup" size={22} /></button>
                  </div>
                </Card>
              )}

              <InstallCard />
              <div className="cta-bar">
                <Button kind="accent" icon="terima-bayar" href="/toko/terima" data-testid="cta-terima">{t("beranda.cta")}</Button>
              </div>
            </main>
            {edit && <NameSheet viewer={viewer} wallet={wallet} name={shop.profile.name ?? ""} nickname={shop.profile.nickname ?? ""} onClose={() => setEdit(false)} onSaved={reload} />}
          </>
        );
      }}
    </Gate>
  );
}
