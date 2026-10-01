"use client";
import { use, useEffect, useState } from "react";
import { gaslessAccept, RelayUnavailable } from "@/lib/gasless";
import { WARUNG, LOAN_STATUS, warungAbi, warungRead, useWallet, write, errText, rupiah, short, txLink } from "@/lib/web3";

export default function Loan({ params }: { params: Promise<{ id: string }> }) {
  const id = BigInt(use(params).id);
  const { account, wallet, connect, error } = useWallet();
  const [l, setL] = useState<any>(null);
  const [p, setP] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState("");
  const [err, setErr] = useState("");
  const load = () => Promise.all([warungRead("loans", [id]), warungRead("p")]).then(([a, b]) => { setL(a); setP(b); }).catch((e) => setErr(e.message.split("\n")[0]));
  useEffect(() => { load(); }, [id]);

  if (err && !l) return <p className="bad">{err}</p>;
  if (!l) return <p className="sub">Reading the loan from the contract…</p>;
  if (l[0] === "0x0000000000000000000000000000000000000000") return <p className="bad">No such loan.</p>;

  const status = LOAN_STATUS[l[1]];
  const principal: bigint = l[3], total: bigint = l[4], fee = total - principal;
  const expires = Number(l[6] + p[2]) * 1000;
  const mine = account?.toLowerCase() === l[0].toLowerCase();
  const expired = status === "Proposed" && Date.now() > expires;

  async function accept() {
    if (!wallet) return;
    setErr(""); setBusy(true);
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
      <h1>Loan #{String(id)} <span className="chip">{expired ? "Expired" : status}</span></h1>
      <p className="sub">For shop <a href={`/m/${l[0]}`} className="mono">{short(l[0])}</a>. These terms are read directly from the smart contract, not from any chat message.</p>
      <div className="grid">
        <div className="stat"><small>You receive</small><strong>{rupiah(principal)}</strong></div>
        <div className="stat"><small>Flat fee</small><strong>{rupiah(fee)}</strong></div>
        <div className="stat"><small>Total to repay</small><strong>{rupiah(total)}</strong></div>
        <div className="stat"><small>Taken from each sale</small><strong>{l[2] / 100}%</strong></div>
      </div>
      <div className="card">
        <p style={{ margin: 0 }}>No collateral, no due date, no penalties. Repayment happens only when you make a sale: {l[2] / 100}% of each payment goes to the pool until {rupiah(total)} is repaid. Quiet week? You simply repay more slowly. (If a shop makes no sales for {Number(p[1]) / 86400} days, the loan is written off and the shop can't borrow again.)</p>
      </div>

      {status === "Proposed" && !expired && (
        <div className="card">
          {!account ? <button onClick={connect}>Connect wallet to accept</button>
            : !mine ? <p className="warn">Connected wallet {short(account)} is not this shop's wallet. Only the shop can accept.</p>
            : <button onClick={accept} disabled={busy}>{busy ? "Waiting…" : `Accept ${rupiah(principal)}`}</button>}
          <p className="sub">Offer valid until {new Date(expires).toLocaleString()}.</p>
        </div>
      )}
      {status === "Active" && <div className="card"><div className="bar"><div style={{ width: `${Number((l[5] * 100n) / total)}%` }} /></div><p className="sub" style={{ margin: 0 }}>Repaid {rupiah(l[5])} of {rupiah(total)}.</p></div>}
      {tx && <p className="ok">✅ Accepted. <a href={txLink(tx)}>View transaction</a></p>}
      {(err || error) && <p className="bad">{err || error}</p>}
      <p className="sub mono">Underwriter rationale hash (keccak256 of the explanation the AI gave): {l[9]}</p>
    </>
  );
}
