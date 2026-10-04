import { Icon, Nota } from "@/components/ui";
import { t } from "@/lib/copy";
import { rupiah } from "@/lib/web3";

/** What the owner repays, in plain words. All numbers come from the contract's loan record, never from chat text. */
export function OfferTerms({ principal, total, repayBps, trailing }: { principal: bigint; total: bigint; repayBps: number; trailing?: bigint }) {
  const fee = total - principal;
  const cut = (10_000_000n * BigInt(repayBps)) / 10_000n; // of a Rp 100.000 sale, in units
  const avgDay = trailing ? trailing / 30n : 0n;
  const perDay = (avgDay * BigInt(repayBps)) / 10_000n;
  const days = perDay > 0n ? Number((total + perDay - 1n) / perDay) : 0;
  return (
    <>
      <Nota>
        <div className="stack" style={{ paddingTop: 12 }} data-testid="offer-terms">
          <div className="kv"><span>{t("modal.offer.principal")}</span><span className="money-md">{rupiah(principal)}</span></div>
          <div className="kv"><span>{t("modal.offer.fee")}</span><span>{rupiah(fee)}</span></div>
          <hr className="rule" />
          <div className="kv"><b>{t("modal.offer.total")}</b><span className="money-md">{rupiah(total)}</span></div>
          <div className="kv"><span>{t("modal.offer.share")}</span><span>{repayBps / 100}%</span></div>
        </div>
      </Nota>
      <div className="card tint"><div className="card-in">
        <b>{t("modal.offer.example.label")}</b>
        <p className="p">{t("modal.offer.example", { cut: rupiah(cut), rest: rupiah(10_000_000n - cut) })}</p>
        {days > 0 && <p className="small">{t("modal.offer.eta", { d: days })}</p>}
      </div></div>
      <ul className="stack" style={{ gap: 8 }}>
        {[1, 2, 3].map((n) => <li key={n} className="row" style={{ gap: 10, fontWeight: 600 }}><Icon name="lunas" size={26} />{t(`modal.promise.${n}` as never)}</li>)}
      </ul>
    </>
  );
}
