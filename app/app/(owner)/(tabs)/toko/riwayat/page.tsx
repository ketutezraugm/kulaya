"use client";
import Link from "next/link";
import { Gate } from "@/components/Gate";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button, Card, Icon, Nota } from "@/components/ui";
import * as scene from "@/components/art/scene";
import { t } from "@/lib/copy";
import { dayLabel, sumUnits } from "@/lib/shop";
import { rupiah, txLink } from "@/lib/web3";

export default function Riwayat() {
  return (
    <Gate>
      {({ shop }) => {
        const p = shop.params;
        const days = shop.days;
        const max = days.reduce((a, d) => (d.v > a ? d.v : a), 1n);
        const byPayer = new Map<number, { total: bigint; n: number }>();
        for (const s of shop.sales) { const e = byPayer.get(s.customerNo) ?? { total: 0n, n: 0 }; e.total += BigInt(s.amount); e.n++; byPayer.set(s.customerNo, e); }
        const top = [...byPayer.entries()].sort((a, b) => (b[1].total > a[1].total ? 1 : -1)).slice(0, 5);
        const groups = new Map<string, typeof shop.sales>();
        for (const s of shop.sales) {
          const e = BigInt(s.epoch);
          const g = e === shop.epoch ? t("riwayat.group.today") : e === shop.epoch - 1n ? t("riwayat.group.yesterday") : dayLabel(e, p.epochLength).toUpperCase();
          groups.set(g, [...(groups.get(g) ?? []), s]);
        }
        return (
          <>
            <TopBar title={t("riwayat.title")} back="/toko" />
            <main className="shell-main">
              {shop.sales.length === 0 ? (
                <div className="stack-lg center" data-testid="riwayat-empty">
                  <Art svg={scene.illEmptyEtalase} />
                  <h2 className="h2">{t("riwayat.empty.title")}</h2>
                  <p className="p">{t("riwayat.empty.body")}</p>
                  <Button href="/toko/terima">{t("beranda.cta")}</Button>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {([[t("riwayat.tot.today"), days[29].v], [t("riwayat.tot.7"), sumUnits(days.slice(-7))], [t("riwayat.tot.30"), shop.trailing]] as const).map(([l, v]) => (
                      <div key={l} className="card"><div className="card-in" style={{ padding: 12, gap: 2 }}><span className="small" style={{ fontSize: 14 }}>{l}</span><b className="num" style={{ fontSize: 16 }}>{rupiah(v)}</b></div></div>
                    ))}
                  </div>
                  <Card>
                    <span className="h3">{t("riwayat.chart.label")}</span>
                    <div className="bars" role="img" aria-label={t("riwayat.chart.label")}>
                      {days.map((d, i) => <i key={String(d.epoch)} className={i === 29 ? "today" : ""} title={`${dayLabel(d.epoch, p.epochLength)}: ${rupiah(d.v)}`} style={{ height: `${Math.max(2, Number((d.v * 100n) / max))}%` }} />)}
                    </div>
                    <div className="bar-labels"><span>{t("riwayat.chart.start")}</span><span>{t("riwayat.chart.mid")}</span><span>{t("riwayat.chart.today")}</span></div>
                    <p className="small">{t("riwayat.chart.exact", { rp: rupiah(shop.trailing), n: shop.payers })}</p>
                    <p className="small">{t("riwayat.cap.note")}</p>
                  </Card>

                  <section className="stack">
                    <h2 className="h3" style={{ fontSize: 22 }}>{t("riwayat.list.title")}</h2>
                    {[...groups.entries()].map(([g, rows]) => (
                      <div key={g} className="stack" style={{ gap: 6 }}>
                        <span className="label" style={{ fontSize: 14, letterSpacing: 0.6 }}>{g}</span>
                        <Nota>{rows.map((s) => (
                          <div className="nota-row" key={s.tx}>
                            <div>
                              <b>{s.memo || "Pembayaran"}</b>
                              <small>{t("riwayat.customer", { n: s.customerNo })}{BigInt(s.repaidCut) > 0n && <> · {t("riwayat.row.cicilan", { rp: rupiah(BigInt(s.repaidCut)) })}</>} · <a href={txLink(s.tx)} target="_blank" rel="noreferrer">tx</a></small>
                            </div>
                            <span className="amt">{rupiah(BigInt(s.amount))}</span>
                          </div>
                        ))}</Nota>
                      </div>
                    ))}
                  </section>

                  {top.length > 0 && (
                    <section className="stack">
                      <h2 className="h3" style={{ fontSize: 22 }}>{t("riwayat.top.title")}</h2>
                      <Card>{top.map(([n, v]) => (
                        <div key={n} className="kv"><span className="row" style={{ gap: 10 }}><Icon name="pelanggan" size={24} />{t("riwayat.customer", { n })}<span className="small">{t("riwayat.top.sub", { n: v.n })}</span></span><span>{rupiah(v.total)}</span></div>
                      ))}</Card>
                    </section>
                  )}
                </>
              )}
            </main>
          </>
        );
      }}
    </Gate>
  );
}
