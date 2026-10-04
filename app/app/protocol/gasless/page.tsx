"use client";
import * as scene from "@/components/art/scene";
import { Art } from "@/components/ui";
import * as dev from "@/components/art/dev";
import { PHead, Sec, Tag } from "@/components/proto";

const FLOWS = [
  ["registerFor", "Owner registers a shop. The signature binds merchant = signer."],
  ["payFor + EIP-2612 permit", "Customer pays. The permit authorises exactly the signed amount to this shop."],
  ["acceptLoanFor", "Owner accepts an offer. The terms are re-read from the chain, not from the payload."],
];
const ATTACKS = [
  ["Tamper", "Change the amount after signing", "BadSignature"],
  ["Redirect", "Swap the merchant address", "BadSignature"],
  ["Replay", "Resubmit a used signature", "BadSignature"],
];

export default function Gasless() {
  return (
    <>
      <PHead route="/protocol/gasless" title="Gasless & relayer" art={scene.illWalletConfirm} artW={170}
        lead="Owners and customers never pay network fees. They sign typed data; the relayer submits it; the contract only moves value to exactly what was signed." />

      <div className="p-card" style={{ padding: 12 }}><Art svg={dev.diaGasless} /></div>

      <div className="p-grid w3">
        {FLOWS.map(([t, d]) => <div className="p-card" key={t}><h3 className="p-mono" style={{ fontFamily: "var(--k-font-mono)" }}>{t}</h3><p className="small">{d}</p></div>)}
      </div>

      <Sec title="Attack cases">
        <table className="p-table"><thead><tr><th>Attack</th><th>What the relayer tries</th><th>Result</th></tr></thead><tbody>
          {ATTACKS.map(([a, w, r]) => <tr key={a}><td><b>{a}</b></td><td>{w}</td><td><Tag kind="block">{r}</Tag></td></tr>)}
        </tbody></table>
        <p className="small">These cases are covered by the Foundry relay tests. The relayer wallet only pays gas; it holds no user funds and cannot change what a signature authorises.</p>
      </Sec>

      <p className="small">When the free relayer is busy or low on gas money, the app falls back to a normal wallet transaction and the user pays the network fee themselves (the owner app says: &ldquo;Layanan gratis sedang ramai&rdquo;).</p>
    </>
  );
}
