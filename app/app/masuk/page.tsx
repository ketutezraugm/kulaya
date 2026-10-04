"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithTelegramCode } from "@/lib/auth";

/** Landing page of the bot's one-tap login link. The code is exchanged with POST (never GET), so link previews can't burn it. */
function Masuk() {
  const t = useSearchParams().get("t") ?? "";
  const router = useRouter();
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!/^[0-9a-f]{32}$/.test(t)) { setErr("Tautan tidak lengkap. Ketik /masuk di Telegram untuk tautan baru."); return; }
    loginWithTelegramCode(t).then(() => router.replace("/dashboard")).catch((e) => setErr((e as Error).message));
  }, [t, router]);

  return (
    <>
      <h1>Masuk ke Kulaya</h1>
      {err ? <div className="card"><p className="bad" style={{ margin: 0 }}>{err}</p></div> : <p className="sub">Sedang memeriksa tautan Anda…</p>}
    </>
  );
}
export default function Page() { return <Suspense><Masuk /></Suspense>; }
