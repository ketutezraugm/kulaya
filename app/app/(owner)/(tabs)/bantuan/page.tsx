"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/OwnerBits";
import { Art, Button, Card, Icon, type IconName } from "@/components/ui";
import * as mascot from "@/components/art/mascot";
import { clearSession } from "@/lib/auth";
import { t } from "@/lib/copy";

const GLOSS: [IconName, string][] = [["modal", "batas"], ["level", "level"], ["cicilan", "cicilan"], ["biaya", "rupiah"], ["dompet", "dompet"]];

export default function Bantuan() {
  const r = useRouter();
  return (
    <>
      <TopBar title={t("bantuan.title")} back={false} />
      <main className="shell-main">
        <Card variant="soft">
          <div className="row" style={{ gap: 12 }}><Art svg={mascot.mascotExplain} w={72} /><h2 className="h3">{t("bantuan.replay.title")}</h2></div>
          <Button kind="secondary" icon="refresh" href="/mulai?tutorial=1">{t("bantuan.replay.btn")}</Button>
        </Card>

        <section className="stack">
          <h2 className="h2">{t("bantuan.faq.title")}</h2>
          <div className="faq">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <details key={n} id={n === 8 ? "uji-coba" : n === 4 ? "modal" : undefined}>
                <summary>{t(`bantuan.faq.${n}` as never)}</summary>
                <p className="p">{t(`bantuan.faq.${n}.a` as never)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="stack">
          <h2 className="h2">{t("bantuan.gloss.title")}</h2>
          <Card>
            {GLOSS.map(([i, k]) => {
              const [term, ...rest] = t(`bantuan.gloss.${k}` as never).split(": ");
              return <div key={k} className="row" style={{ alignItems: "flex-start", gap: 12 }}><span className="row" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--k-color-accent-soft)", justifyContent: "center", flex: "none" }}><Icon name={i} size={28} /></span><p className="p"><b>{term}</b><br />{rest.join(": ")}</p></div>;
            })}
          </Card>
        </section>

        <div className="stack">
          <Link href="/protocol" lang="en" style={{ fontWeight: 700 }}>{t("global.link.protocol")} →</Link>
          <Button kind="quiet" icon="keluar" onClick={() => { clearSession(); r.replace("/"); }} data-testid="logout">{t("baru.logout")}</Button>
        </div>
      </main>
    </>
  );
}
