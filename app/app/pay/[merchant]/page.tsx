"use client";
import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";
import { gaslessPay, gaslessFaucet, RelayUnavailable } from "@/lib/gasless";
import { IDRX, WARUNG, erc20Abi, warungAbi, warungRead, publicClient, useWallet, write, errText, rupiah, short, txLink } from "@/lib/web3";

function Pay({ merchant }: { merchant: Address }) {
  const q = useSearchParams();
  const amountRp = Number(q.get("amount") ?? 0);
  const note = q.get("note") ?? "";
  const { account, wallet, connect, error } = useWallet();
  const [m, setM] = useState<any>(null);
  const [bal, setBal] = useState<bigint | null>(null);
  const [busy, setBusy] = useState("");
  const [tx, setTx] = useState("");
  const [err, setErr] = useState("");
  const units = BigInt(Math.floor(amountRp)) * 100n;

  useEffect(() => { warungRead("merchants", [merchant]).then(setM).catch(() => {}); }, [merchant]);
  useEffect(() => { if (account) publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [account] }).then(setBal); }, [account, tx, busy]);

  async function pay() {
    setErr(""); setTx("");
    try {
      if (!wallet || !account) return;
      try {
        setBusy("Sign the payment: no BNB needed, we cover the gas…");
        setTx(await gaslessPay(wallet, account, merchant, units, note.slice(0, 140)));
        return;
      } catch (e) {
        if (!(e instanceof RelayUnavailable)) throw e; // a real rejection (bad amount, not registered...) is shown as-is
      }
      setBusy("Gasless service busy: paying with your own gas instead…");
      const nonce = await publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "nonces", args: [account] });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const sig = await wallet.signTypedData({
        domain: { name: "Mock IDRX", version: "1", chainId: 97, verifyingContract: IDRX },
        types: { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
        primaryType: "Permit", message: { owner: account, spender: WARUNG, value: units, nonce, deadline },
      });
      const r = `0x${sig.slice(2, 66)}` as const, s = `0x${sig.slice(66, 130)}` as const, v = parseInt(sig.slice(130, 132), 16);
      setBusy("Confirm the payment in your wallet…");
      setTx(await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "payWithPermit", args: [merchant, units, note.slice(0, 140), deadline, v, r, s] }));
    } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  }

  async function faucet() {
    if (!wallet || !account) return;
    setErr(""); setBusy("Minting test IDRX…");
    try {
      try { await gaslessFaucet(account); } catch (e) { if (!(e instanceof RelayUnavailable)) throw e; await write(wallet, { address: IDRX, abi: erc20Abi, functionName: "mint", args: [account, 100_000_000n] }); }
    } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  }

  if (m && !m[0]) return <p className="bad">This shop isn't registered.</p>;
  const short_ = bal !== null && bal < units;
  return (
    <>
      <h1>Pay {amountRp ? rupiah(units) : "…"}</h1>
      <p className="sub">to shop <a className="mono" href={`/m/${merchant}`}>{short(merchant)}</a>{note && <> · “{note}”</>}</p>
      <div className="card">
        {!amountRp && <p className="bad">Missing amount in the link.</p>}
        {!account ? <button onClick={connect}>Connect wallet</button> : (
          <>
            <p className="sub">Your balance: {bal === null ? "…" : rupiah(bal)} test IDRX {short_ && <button className="ghost" onClick={faucet} disabled={!!busy}>Get test IDRX</button>}</p>
            <button onClick={pay} disabled={!!busy || !amountRp || short_}>Pay {amountRp ? rupiah(units) : ""}</button>
          </>
        )}
        {busy && <p className="sub">{busy}</p>}
        {tx && <p className="ok">✅ Paid. <a href={txLink(tx)}>View transaction</a></p>}
        {(err || error) && <p className="bad">{err || error}</p>}
      </div>
      <p className="sub">If this shop has a loan, a small share of your payment automatically repays it. You always pay the same amount.</p>
    </>
  );
}
export default function Page({ params }: { params: Promise<{ merchant: string }> }) {
  const { merchant } = use(params);
  return <Suspense><Pay merchant={merchant as Address} /></Suspense>;
}
