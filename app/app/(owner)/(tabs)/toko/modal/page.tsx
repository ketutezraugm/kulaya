"use client";
import Link from "next/link";
import { useState } from "react";
import { Gate } from "@/components/Gate";
import { OfferTerms } from "@/components/OfferTerms";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button, Card, Check, Icon, Nota, Pill, Progress, Sheet } from "@/components/ui";
import * as scene from "@/components/art/scene";
import * as stall from "@/components/art/stall";
import { clearToken, getToken, signIn } from "@/lib/auth";
import { LEVELS, MIN_LOAN_RP, capitalState, whenId } from "@/lib/capital";
import { t } from "@/lib/copy";
import { RelayUnavailable, gaslessAccept } from "@/lib/gasless";
import { dayLabel } from "@/lib/shop";
import { BOT_API, WARUNG, errText, rupiah, rupiahFriendly, warungAbi, write } from "@/lib/web3";

const BADGES = [stall.badgeLevelPerintis, stall.badgeLevelBerkembang, stall.badgeLevelMaju, stall.badgeLevelUnggul];
const DAY = 86_400_000;

export default function Modal() {
  const [prep, setPrep] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [accepted, setAccepted] = useState<{ rp: string; x: number } | null>(null);

  return (
    <Gate>
      {({ shop, viewer, wallet, connect, reload }) => {
        const p = shop.params;
        const cap = capitalState(shop);
        const l = shop.loan;
        const level = LEVELS[Math.min(3, shop.tier)];
        const byRevenue = (shop.trailing * BigInt(p.maxLoanBps)) / 10_000n;
        const tierCeiling = p.baseTierMax << BigInt(shop.tier);
        const lastDerived = shop.loans[0]?.derived;
        const open = cap.kind === "offer" || cap.kind === "active";

        async function requestOffer() {
          setErr(""); setBusy("offer");
          try {
            let token = getToken(viewer);
            if (!token) { if (!wallet) throw new Error(t("baru.wallet.only")); token = await signIn(wallet, viewer); }
            const r = await fetch(`${BOT_API}/chat`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ message: "Saya mau pinjam modal" }) });
            const j = await r.json().catch(() => ({}));
            if (r.status === 401) { clearToken(viewer); throw new Error(t("masuk.session.body")); }
            if (!r.ok) throw new Error(j.error ?? t("tanya.busy"));
            if (!j.loan) throw new Error(j.reply ?? t("tanya.busy"));
            await reload();
          } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
        }

        async function accept() {
          if (!wallet || !l) return;
          setPrep(false); setErr(""); setBusy("accept");
          try {
            try { await gaslessAccept(wallet, viewer, l.id); } catch (e) {
              if (!(e instanceof RelayUnavailable)) throw e;
              await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "acceptLoan", args: [l.id] });
            }
            setAccepted({ rp: rupiah(l.principal), x: l.repayBps / 100 });
            await reload();
          } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
        }

        const quiet = cap.kind === "active" && l && Date.now() - Math.max(Number(l.lastSaleAt), Number(l.acceptedAt)) * 1000 > 7 * DAY;

        return (
          <>
            <TopBar title={t("modal.title")} back="/toko" />
            <main className="shell-main">
              {accepted && (
                <Card variant="soft" data-testid="accepted">
                  <Art svg={scene.illCoinDrop} w={160} className="coin-drop" style={{ alignSelf: "center" }} />
                  <h2 className="h2">{t("modal.success.title", { rp: accepted.rp })}</h2>
                  <p className="p">{t("modal.success.body", { x: accepted.x })}</p>
                </Card>
              )}

              {cap.kind === "offer" && l && (
                <>
                  <Pill kind="wait">{t("beranda.cap.offer.pill")}</Pill>
                  <h2 className="h1">{t("modal.offer.title")}</h2>
                  <p className="lead">{t("modal.offer.lead")}</p>
                  <p className="small">{t("modal.offer.until", { when: whenId(cap.expiresAt) })}</p>
                  <OfferTerms principal={l.principal} total={l.total} repayBps={l.repayBps} trailing={shop.trailing} />
                  {err && <p className="err" role="alert">{err}</p>}
                  <div className="cta-bar">
                    {wallet
                      ? <Button kind="accent" disabled={!!busy} data-testid="accept-offer" onClick={() => setPrep(true)}>{busy === "accept" ? t("setup.connect.wait.title") : t("modal.btn.accept")}</Button>
                      : <><p className="small">{t("baru.wallet.only")}</p><Button onClick={() => connect()} icon="dompet">{t("baru.wallet.connect")}</Button></>}
                    <Button kind="quiet" href="/toko">{t("modal.btn.decline")}</Button>
                  </div>
                </>
              )}

              {cap.kind === "active" && l && (
                <>
                  <Pill kind="info" icon="cicilan">{t("beranda.cap.active.label")}</Pill>
                  <Card variant="key" awning>
                    <span className="label">{t("modal.active.paid")}</span>
                    <span className="money-xl">{rupiah(l.repaid)}</span>
                    <Progress pct={cap.pct} />
                    <span className="small">{t("modal.active.of", { paid: rupiah(l.repaid), total: rupiah(l.total) })}</span>
                    <hr className="rule" />
                    <div className="kv"><span>{t("modal.active.rest")}</span><span>{rupiah(l.total - l.repaid)}</span></div>
                    <div className="kv"><span>{t("modal.active.cut")}</span><span>{l.repayBps / 100}%</span></div>
                  </Card>
                  <p className="p">{t("modal.active.calm")}</p>
                  {quiet && <Card variant="soft"><Pill kind="wait">{t("modal.quiet.pill")}</Pill><h3 className="h3">{t("modal.quiet.title")}</h3><p className="p">{t("modal.quiet.body")}</p><p className="small">{t("modal.quiet.sub")}</p><Button kind="secondary" href="/toko/tanya">{t("beranda.tanya.title")}</Button></Card>}
                  <section className="stack">
                    <h2 className="h3" style={{ fontSize: 22 }}>{t("modal.active.list")}</h2>
                    {shop.sales.filter((s) => BigInt(s.repaidCut) > 0n).length === 0 ? <p className="small">{t("modal.active.calm")}</p> : (
                      <Nota>{shop.sales.filter((s) => BigInt(s.repaidCut) > 0n).slice(0, 5).map((s) => (
                        <div className="nota-row" key={s.tx}><div><b>{t("modal.active.row", { rp: rupiah(BigInt(s.repaidCut)) })}</b><small>{dayLabel(BigInt(s.epoch), p.epochLength)} · {t("riwayat.customer", { n: s.customerNo })}</small></div><span className="amt">{rupiah(BigInt(s.amount))}</span></div>
                      ))}</Nota>
                    )}
                  </section>
                </>
              )}

              {cap.kind === "def" && (
                <>
                  <Pill kind="wait" icon="peringatan">{t("beranda.cap.def.pill")}</Pill>
                  <p className="p">{t("beranda.cap.def.body")}</p>
                  <p className="small">{t("beranda.cap.def.sub")}</p>
                </>
              )}

              {cap.kind === "repaid" && (
                <Card variant="soft"><div className="row" style={{ alignItems: "flex-start" }}><div className="stack grow"><Pill kind="ok">{t("beranda.cap.repaid.pill")}</Pill><h2 className="h2">{t("beranda.cap.repaid.title", { level })}</h2><p className="p">{t("beranda.cap.repaid.body", { rp: rupiah(tierCeiling) })}</p></div><Art svg={BADGES[Math.min(3, shop.tier)]} w={72} /></div></Card>
              )}

              {!open && cap.kind !== "def" && (
                <>
                  {lastDerived === "Expired" && cap.kind !== "repaid" && (
                    <Card variant="tint" data-testid="expired"><Pill kind="wait" icon="waktu">{t("baru.st.Expired")}</Pill><h3 className="h3">{t("baru.expired.title")}</h3><p className="p">{t("baru.expired.body")}</p></Card>
                  )}
                  <span className="label">{t("modal.limit.label")}</span>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="money-xl" data-testid="limit-value">{rupiah(shop.creditLimit)}</span>
                    <span className="small">{t("modal.limit.friendly", { rp_friendly: rupiahFriendly(shop.creditLimit) })}</span>
                  </div>
                  <Nota>
                    <div className="stack" style={{ paddingTop: 12 }}>
                      <div className="kv"><span>{t("modal.eq.label")}</span><span>{rupiah(shop.trailing)}</span></div>
                      <div className="kv"><span>{t("modal.eq.ten")}</span><span>{rupiah(byRevenue)}</span></div>
                      <hr className="rule" />
                      <p className="p">{t("modal.eq.level", { level, rp: rupiah(tierCeiling), limit: rupiah(shop.creditLimit) })}</p>
                    </div>
                  </Nota>
                  <section className="stack">
                    <h2 className="h3" style={{ fontSize: 22 }}>{t("modal.check.title")}</h2>
                    <Check ok={shop.payers >= p.minPayers} title={t("modal.check.1")} sub={t("modal.check.1.ok", { n: shop.payers })} />
                    <Check ok={shop.creditLimit >= MIN_LOAN_RP * 100n} title={t("modal.check.2")} />
                    <Check ok title={t("modal.check.3")} />
                    <Check ok={!shop.defaulted} title={t("modal.check.4")} />
                  </section>
                  {err && <p className="err" role="alert">{err}</p>}
                  <div className="cta-bar">
                    <Button data-testid="request-offer" disabled={!(cap.kind === "ok" || cap.kind === "repaid") || !!busy} onClick={requestOffer}>{busy === "offer" ? t("beranda.cap.offer.title") + "…" : t("modal.btn.request")}</Button>
                  </div>
                </>
              )}

              {shop.loans.length > 0 && (
                <section className="stack" data-testid="loan-history">
                  <h2 className="h3" style={{ fontSize: 22 }}>{t("baru.hist.title")}</h2>
                  <div className="card"><div className="card-in" style={{ gap: 0 }}>
                    {shop.loans.map((x0) => {
                      // the loan the contract says is current wins over the (cached) history list
                      const x = l && String(l.id) === x0.id ? { ...x0, derived: l.status, repaid: String(l.repaid), total: String(l.total) } : x0;
                      return (
                      <div key={x.id} className="nota-row">
                        <div className="stack" style={{ gap: 4 }}>
                          <b>{t("baru.hist.row", { id: x.id })}</b>
                          <small>{x.derived === "Active" || x.derived === "Repaid" ? t("baru.hist.of", { paid: rupiah(BigInt(x.repaid)), total: rupiah(BigInt(x.total)) }) : t("baru.hist.total", { total: rupiah(BigInt(x.total)) })}</small>
                        </div>
                        <div className="stack" style={{ alignItems: "flex-end", gap: 4 }}>
                          <span className="amt">{rupiah(BigInt(x.principal))}</span>
                          <Pill kind={x.derived === "Repaid" ? "ok" : x.derived === "Active" ? "info" : x.derived === "Defaulted" ? "bad" : "wait"} icon={x.derived === "Active" ? "cicilan" : undefined}>{t(`baru.st.${x.derived}` as never)}</Pill>
                        </div>
                      </div>
                    );})}
                  </div></div>
                </section>
              )}
            </main>
            {prep && (
              <Sheet title={t("modal.prep.title")} onClose={() => setPrep(false)}>
                <Art svg={scene.illWalletConfirm} w={220} style={{ alignSelf: "center" }} />
                <h2 className="h2">{t("modal.prep.title")}</h2>
                <p className="p">{t("modal.prep.body")}</p>
                <p className="small">{t("global.wallet.name_note")}</p>
                <Button kind="accent" data-testid="accept-confirm" onClick={accept}>{t("setup.connect.prep.btn")}</Button>
                <Button kind="quiet" onClick={() => setPrep(false)}>{t("setup.connect.wait.cancel")}</Button>
              </Sheet>
            )}
          </>
        );
      }}
    </Gate>
  );
}
