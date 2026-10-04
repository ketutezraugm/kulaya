"use client";
import { usePathname } from "next/navigation";
import { Art } from "@/components/ui";
import * as mascot from "@/components/art/mascot";
import { t } from "@/lib/copy";

/** Human copy first; the technician disclosure holds only code, route and time, never user data. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const path = usePathname();
  return (
    <div className="shell" data-site="owner">
      <main className="shell-main" style={{ justifyContent: "center", textAlign: "center", alignItems: "center", gap: 16, minHeight: "100dvh" }} role="alert">
        <Art svg={mascot.mascotApologetic} w={160} />
        <h1 className="h2">{t("err.error.title")}</h1>
        <p className="p">{t("err.error.body")}</p>
        <button className="btn" onClick={reset}>{t("err.retry")}</button>
        <details className="details-tech" style={{ textAlign: "left", alignSelf: "stretch" }}>
          <summary>{t("global.detail.teknisi")}</summary>
          <pre>{`kode: ${error.digest ?? "-"}\nhalaman: ${path}\nwaktu: ${new Date().toISOString()}`}</pre>
        </details>
      </main>
    </div>
  );
}
