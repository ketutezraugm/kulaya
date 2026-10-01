"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { gaslessRegister, RelayUnavailable } from "@/lib/gasless";
import { BOT_API, WARUNG, warungAbi, warungRead, useWallet, write, errText, short } from "@/lib/web3";

function Onboard() {
  const code = useSearchParams().get("code") ?? "";
  const { account, wallet, connect, error } = useWallet();
  const [step, setStep] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setErr("");
    try {
      if (!account || !wallet) { await connect(); return; }
      setStep("Checking your shop…");
      const m = await warungRead("merchants", [account]);
      if (!m[0]) {
        setStep("Registering your shop on-chain: sign once, no BNB needed…");
        try { await gaslessRegister(wallet, account); } catch (e) {
          if (!(e instanceof RelayUnavailable)) throw e;
          setStep("Gasless service busy: registering with your own gas (confirm in wallet)…");
          await write(wallet, { address: WARUNG, abi: warungAbi, functionName: "register" });
        }
      }
      setStep("Sign to link this wallet to your Telegram (free, no gas)…");
      const signature = await wallet.signMessage({ message: `Link Warung Agent Telegram: ${code}` });
      const r = await fetch(`${BOT_API}/link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, address: account, signature }) });
      if (!r.ok) throw new Error((await r.json()).error ?? "link failed");
      setDone(true);
    } catch (e) { setErr(errText(e)); } finally { setStep(""); }
  }

  if (!code) return <p>Open this page from the Telegram bot (<a href="https://t.me/WarungAgenttBot">/link</a>).</p>;
  return (
    <>
      <h1>Connect your shop wallet</h1>
      <p className="sub">One time. We register your shop on BNB Chain and link it to your Telegram chat. We never hold your keys.</p>
      <div className="card">
        {done ? <p className="ok"><b>✅ Done.</b> Go back to Telegram and say hi to your assistant.</p> : (
          <>
            <p>{account ? <>Wallet <span className="mono">{short(account)}</span></> : "No wallet connected yet."}</p>
            <button onClick={run} disabled={!!step}>{account ? "Register & link" : "Connect wallet"}</button>
            {step && <p className="sub">{step}</p>}
          </>
        )}
        {(err || error) && <p className="bad">{err || error}</p>}
        <p className="sub">No BNB needed: you only sign, we pay the network fee.</p>
      </div>
    </>
  );
}
export default function Page() { return <Suspense><Onboard /></Suspense>; }
