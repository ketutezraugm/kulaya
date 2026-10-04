import Link from "next/link";
import { Art, Button, Card, Icon, Nota, type IconName } from "@/components/ui";
import * as logo from "@/components/art/logo";
import * as scene from "@/components/art/scene";
import * as mascot from "@/components/art/mascot";
import { TG_URL } from "@/lib/brand";
import { cols, t } from "@/lib/copy";

const TRUST: [IconName, string][] = [["tanpa-jaminan", t("landing.trust.1")], ["tanpa-penagih", t("landing.trust.2")], ["biaya", t("landing.trust.3")], ["aman", t("landing.trust.4")]];
const HOW = [[scene.illStepScan, "1"], [scene.illStepOffer, "2"], [scene.illStepSplit, "3"]] as const;
const ROWS = ["penagih", "kontak", "bunga", "denda", "tempo"] as const;

export default function Landing() {
  return (
    <main className="shell-main" style={{ gap: 28 }}>
      <header className="row between" style={{ paddingTop: 8 }}>
        <Art svg={logo.logoLockup} w={132} />
        <Link href="/masuk" className="btn quiet inline sm" data-testid="nav-masuk">{t("landing.header.masuk")}</Link>
      </header>

      <section className="stack-lg">
        <Link href="/protocol" className="small" style={{ color: "var(--k-color-link)", fontWeight: 600 }} lang="en">{t("global.link.protocol")} →</Link>
        <h1 className="h-display">{t("landing.hero.title")}</h1>
        <p className="lead p">{t("landing.hero.body")}</p>
        <Art svg={scene.illLandingHero} />
        <div className="stack">
          <Button href="/mulai" data-testid="cta-mulai">{t("landing.cta.primary")}</Button>
          <Button href="/masuk" kind="secondary">{t("landing.cta.secondary")}</Button>
        </div>
        <ul style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {TRUST.map(([i, label]) => <li key={label} className="row" style={{ gap: 8, fontWeight: 600, fontSize: 16 }}><Icon name={i} size={28} />{label}</li>)}
        </ul>
      </section>

      <div className="awning-edge strong" style={{ margin: "0 -20px" }} />

      <section className="stack-lg">
        <h2 className="h2">{t("landing.how.title")}</h2>
        {HOW.map(([svg, n]) => (
          <div key={n} className="stack">
            <Card variant="soft" pad={false}><Art svg={svg} /></Card>
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <span className="row" style={{ width: 36, height: 36, borderRadius: 18, background: "var(--k-color-nila-900)", color: "#fff", justifyContent: "center", font: "400 20px var(--k-font-display)", flex: "none" }}>{n}</span>
              <div className="stack" style={{ gap: 4 }}>
                <h3 className="h3">{t(`landing.how.${n}.title` as never)}</h3>
                <p className="p">{t(`landing.how.${n}.body` as never)}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="stack-lg" style={{ background: "var(--k-color-bg-sunk)", margin: "0 -20px", padding: "28px 20px" }}>
        <h2 className="h2">{t("landing.pinjol.title")}</h2>
        <p className="p">{t("landing.pinjol.lead")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Art svg={scene.illPinjolSide} /><Art svg={scene.illKulayaSide} /></div>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", font: "700 16px var(--k-font-body)" }}>
            <span style={{ padding: 12, background: "var(--k-color-nila-900)", color: "#fff" }}>Pinjol</span>
            <span className="row" style={{ padding: 12, background: "var(--k-color-accent)", color: "var(--k-color-on-accent)", gap: 6 }}><Icon name="aman" size={20} />Kulaya</span>
          </div>
          {ROWS.map((r) => {
            const [name, bad, good] = cols(`landing.pinjol.row.${r}` as never);
            return (
              <div key={r} style={{ borderTop: "1.5px solid var(--k-color-border)" }}>
                <div className="small" style={{ padding: "10px 12px 0", fontWeight: 700, textTransform: "uppercase", fontSize: 14, letterSpacing: 0.4 }}>{name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <span className="row" style={{ padding: 12, alignItems: "flex-start", gap: 8, color: "var(--k-color-danger)", fontWeight: 600, fontSize: 16 }}><Icon name="gagal" size={22} />{bad}</span>
                  <span className="row" style={{ padding: 12, alignItems: "flex-start", gap: 8, background: "var(--k-color-success-soft)", color: "var(--k-color-success)", fontWeight: 600, fontSize: 16 }}><Icon name="lunas" size={22} />{good}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack-lg">
        <Nota>
          <div className="stack" style={{ paddingTop: 12 }}>
            <div className="row between"><h2 className="h3">{t("landing.example.title")}</h2><span className="small">{t("landing.example.tag")}</span></div>
            {(["modal", "fee", "share"] as const).map((k) => { const [a, b] = t(`landing.example.${k}`).split(": "); return <div key={k} className="kv"><span>{a}</span><span>{b}</span></div>; })}
            <hr className="rule" />
            <p className="p" style={{ fontWeight: 600 }}>{t("landing.example.sale")}</p>
            <div className="card" style={{ borderColor: "var(--k-color-ink)", borderWidth: 2 }}>
              <div className="card-in num" style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                {t("landing.example.split").split(" · ").map((x) => <span key={x}>{x}</span>)}
              </div>
            </div>
          </div>
        </Nota>
      </section>

      <Card variant="soft" awning>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}><Art svg={mascot.mascotGreet} w={72} /><h2 className="h3" style={{ paddingTop: 6 }}>{t("landing.tg.title")}</h2></div>
        <Button kind="secondary" icon="telegram" href={TG_URL} external>{t("landing.tg.btn")}</Button>
      </Card>

      <footer className="kawung" style={{ margin: "0 -20px -28px", padding: "28px 20px 36px", background: "var(--k-color-nila-900)", color: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
        <Art svg={logo.logoLockupReversed} w={132} />
        <Link href="/protocol" style={{ color: "var(--k-color-kunyit-200)", fontWeight: 700 }} lang="en">{t("global.link.protocol")} →</Link>
        <p style={{ fontSize: 16 }}>{t("landing.footer.test")}</p>
        <p style={{ fontSize: 16 }}>{t("landing.footer.event")}</p>
      </footer>
    </main>
  );
}
