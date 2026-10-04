"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { OfferTerms } from "@/components/OfferTerms";
import { Art, Button, Card, Pill, Sheet, Skel } from "@/components/ui";
import * as logo from "@/components/art/logo";
import * as scene from "@/components/art/scene";
import { capitalState, whenId } from "@/lib/capital";
import { t } from "@/lib/copy";
import { RelayUnavailable, gaslessAccept } from "@/lib/gasless";
import { LOAN_STATUS, WARUNG, errText, rupiah, short, txLink, useWallet, warungAbi, warungRead, write } from "@/lib/web3";

/** Link target of the AI's "Lihat & setujui": the offer, read straight from the contract. */
export default function ModalOffer({ params }: { params: Promise<{ id: string }> }) {
  const id = BigInt(use(params).id);
  const { account, wallet, connect } = useWallet();
  const [l, setL] = useState<any>(null);
  const [p, setP] = useState<any>(null);
  const [trailing, setTrailing] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [prep, setPrep] = useState(false);
  const [tx, setTx] = useState("");
  const [err, setErr] = useState("");
  const load = () => Promise.all([warungRead("loans", [id]), warungRead("p")]).then(async ([a, b]) => { setL(a); setP(b); if (a[0] !== "0x0000000000000000000000000000000000000000") setTrailing(await warungRead("trailingRevenue", [a[0]])); }).catch((e) => setErr(e.message.split("\n")[0]));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const head = <header className="row" style={{ padding: "16px 20px 0" }}><Link href="/"><Art svg={logo.logoLockup} w={104} /></Link></header>;
  if (err && !l) return <>{head}<main className="shell-main"><p className="err" role="alert">{err}</p></main></>;
  if (!l) return <>{head}<main className="shell-main" aria-busy="true"><Skel h={200} /></main></>;
  if (l[0] === "0x0000000000000000000000000000000000000000") return <>{head}<main className="shell-main"><div className="stack-lg center"><Art svg={scene.illShutterClosed} w={220} /><h1 className="h2">Penawaran tidak ditemukan.</h1></div></main></>;

  const status = LOAN_STATUS[l[1]];
  const principal: bigint = l[3], total: bigint = l[4];
  const expiresAt = Number(l[6] + p[2]) * 1000;
  const expired = status === "Proposed" && Date.now() > expiresAt;
  const mine = account?.toLowerCase() === l[0].toLowerCase();

  async function accept() {
    if (!wallet) return;
    setPrep(false); setErr(""); setBusy(true);
    try {
      try { setTx(await gaslessAccept(wallet, account!, id)); } catch (e) {
        if (!(e instanceof RelayUnavailable)) throw e;
        setTx(await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "acceptLoan", args: [id] }));
      }
      await load();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  return (
    <>
      {head}
      <main className="shell-main">
        {expired || status !== "Proposed" ? (
          <>
            {expired ? <Card variant="tint" data-testid="expired"><Pill kind="wait" icon="waktu">{t("baru.st.Expired")}</Pill><h1 className="h2">{t("baru.expired.title")}</h1><p className="p">{t("baru.expired.body")}</p></Card>
              : <Pill kind={status === "Repaid" ? "ok" : "info"}>{t(`baru.st.${status}` as never)}</Pill>}
            <Button href="/toko/modal">{expired ? t("baru.expired.btn") : t("beranda.cap.active.btn")}</Button>
          </>
        ) : (
          <>
            <Pill kind="wait">{t("beranda.cap.offer.pill")}</Pill>
            <h1 className="h1">{t("modal.offer.title")}</h1>
            <p className="lead">{t("modal.offer.lead")}</p>
            <p className="small">{t("modal.offer.until", { when: whenId(expiresAt) })}</p>
            <OfferTerms principal={principal} total={total} repayBps={l[2]} trailing={trailing} />
            {tx && <Card variant="soft" role="status" data-testid="accepted"><h2 className="h3">{t("modal.success.title", { rp: rupiah(principal) })}</h2><a href={txLink(tx)} target="_blank" rel="noreferrer">{t("bayar.ok.proof")}</a></Card>}
            {err && <p className="err" role="alert">{err}</p>}
            {!tx && (
              <div className="cta-bar solo">
                {!account ? <><p className="small">{t("baru.wallet.only")}</p><Button icon="dompet" onClick={() => connect()}>{t("baru.wallet.connect")}</Button></>
                  : !mine ? <p className="small">{short(account)}: {t("baru.wallet.only")}</p>
                  : <Button kind="accent" disabled={busy} data-testid="accept-offer" onClick={() => setPrep(true)}>{t("modal.btn.accept")}</Button>}
                <Button kind="quiet" href="/toko">{t("modal.btn.decline")}</Button>
              </div>
            )}
          </>
        )}
      </main>
      {prep && (
        <Sheet title={t("modal.prep.title")} onClose={() => setPrep(false)}>
          <Art svg={scene.illWalletConfirm} w={200} style={{ alignSelf: "center" }} />
          <h2 className="h2">{t("modal.prep.title")}</h2><p className="p">{t("modal.prep.body")}</p><p className="small">{t("global.wallet.name_note")}</p>
          <Button kind="accent" data-testid="accept-confirm" onClick={accept}>{t("setup.connect.prep.btn")}</Button>
          <Button kind="quiet" onClick={() => setPrep(false)}>{t("setup.connect.wait.cancel")}</Button>
        </Sheet>
      )}
    </>
  );
}
