"use client";
import { useState } from "react";
import { Button, Sheet } from "@/components/ui";
import { getToken, signIn } from "@/lib/auth";
import { t } from "@/lib/copy";
import { BOT_API, errText, type useWallet } from "@/lib/web3";
import type { Address } from "viem";

type Wallet = NonNullable<ReturnType<typeof useWallet>["wallet"]>;

/** Edit shop name + nickname. Works with a wallet or a Telegram session (the session token authorizes it). */
export function NameSheet({ viewer, wallet, name, nickname, onClose, onSaved }: { viewer: Address; wallet: Wallet | null; name: string; nickname: string; onClose: () => void; onSaved: () => void }) {
  const [n, setN] = useState(name);
  const [k, setK] = useState(nickname);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr(""); setBusy(true);
    try {
      let token = getToken(viewer);
      if (!token) { if (!wallet) throw new Error(t("baru.wallet.only")); token = await signIn(wallet, viewer); }
      const r = await fetch(`${BOT_API}/profile`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ name: n, nickname: k }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? t("baru.name.rule"));
      onSaved(); onClose();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  return (
    <Sheet title={t("baru.name.edit")} onClose={onClose}>
      <h2 className="h2">{t("baru.name.edit")}</h2>
      <div className="field"><label htmlFor="e1">{t("setup.name.label")}</label><input id="e1" className="input plain" data-testid="edit-name" value={n} maxLength={40} onChange={(e) => setN(e.target.value)} aria-invalid={!!err} /><span className="small">{t("baru.name.rule")}</span></div>
      <div className="field"><label htmlFor="e2">{t("setup.nick.label")}</label><input id="e2" className="input plain" data-testid="edit-nick" value={k} maxLength={20} onChange={(e) => setK(e.target.value)} /></div>
      {err && <p className="err" role="alert">{err}</p>}
      <Button data-testid="edit-save" disabled={busy || n.trim().length < 2} onClick={save}>{t("setup.name.btn")}</Button>
      <Button kind="quiet" onClick={onClose}>{t("setup.connect.wait.cancel")}</Button>
    </Sheet>
  );
}
