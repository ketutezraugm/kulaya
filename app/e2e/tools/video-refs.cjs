// Captures reference screens of the LIVE app for the demo-video handoff (docs/video/refs). Phone 390x844 @2x, desktop 1440x900.
// Logs in as the demo shop with a Telegram login code (read-only session), names it if unnamed, runs one red-team simulation.
const { chromium } = require("playwright-core");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const BASE = process.env.APP_BASE || "https://kulaya.vercel.app";
const M = "0x7FeaeE8CFcC8D0E79329A864Fcf9758F4DDd98C6";
const OUT = path.join(process.cwd(), "..", "docs", "video", "refs");
fs.mkdirSync(OUT, { recursive: true });
const code = () => execSync(`npx tsx --env-file=.env.local scripts/login-code.mts ${M}`).toString().trim().split("\n").pop();

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await phone.newPage();
  const shot = async (name, full = false) => { await p.waitForTimeout(2500); await p.screenshot({ path: path.join(OUT, name + ".png"), fullPage: full }); console.log("saved", name); };

  await p.goto(`${BASE}/masuk?t=${code()}`); await p.waitForURL(/\/toko$/);
  await p.getByTestId("sales-card").waitFor({ timeout: 60000 });
  const s = JSON.parse(await p.evaluate(() => sessionStorage.getItem("kulaya_session")));
  const prof = await (await fetch(`${BASE}/api/profile?merchant=${M}`)).json();
  if (!prof.name) {
    const r = await fetch(`${BASE}/api/profile`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${s.token}` }, body: JSON.stringify({ name: "Warung Bu Sri", nickname: "Bu Sri" }) });
    console.log("named demo shop:", r.status);
    await p.waitForTimeout(6000);
  }
  await p.goto(`${BASE}/toko`); await p.getByTestId("sales-card").waitFor();
  await shot("01-beranda"); await shot("01-beranda-full", true);
  await p.goto(`${BASE}/toko/terima`); await p.getByTestId("make-qr").waitFor(); await shot("02-terima-amount");
  await p.getByTestId("make-qr").click(); await p.getByTestId("qr-box").waitFor(); await shot("03-terima-qr");
  await p.goto(`${BASE}/toko/modal`); await shot("04-modal-limit", true);
  await p.goto(`${BASE}/toko/riwayat`); await shot("05-riwayat");
  await p.goto(`${BASE}/toko/tanya`); await shot("06-tanya-empty");
  await p.goto(`${BASE}/`); await shot("00-landing"); await shot("00-landing-full", true);
  const c = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  await c.addInitScript(() => { delete window.ethereum; });
  await c.goto(`${BASE}/bayar/${M}?amount=25000&note=bakso%202%20mangkok`); await c.waitForTimeout(3000);
  await c.screenshot({ path: path.join(OUT, "07-customer-pay.png") }); console.log("saved 07-customer-pay");

  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await d.goto(`${BASE}/protocol`); await d.waitForTimeout(5000);
  await d.screenshot({ path: path.join(OUT, "10-protocol-overview.png") }); console.log("saved 10");
  await d.goto(`${BASE}/protocol/redteam`);
  await d.getByTestId("mode-raw").click();
  await d.getByTestId("run-attack").click();
  await d.getByTestId("rt-result").waitFor({ timeout: 60000 }); await d.waitForTimeout(800);
  await d.screenshot({ path: path.join(OUT, "11-redteam-policy-blocked.png"), fullPage: true }); console.log("saved 11");
  await d.getByTestId("skip-policy").check(); await d.getByTestId("run-attack").click();
  await d.waitForFunction(() => /REVERTED/.test(document.querySelector("[data-testid=rt-result]")?.textContent || ""), null, { timeout: 60000 });
  await d.waitForTimeout(800);
  await d.screenshot({ path: path.join(OUT, "12-redteam-contract-reverts.png"), fullPage: true }); console.log("saved 12");
  console.log("REVERT:", (await d.getByTestId("rt-result").innerText()).split("\n").filter((l) => /Reverted|REVERTED|\(/.test(l)).join(" | ").slice(0, 200));
  await b.close();
})().catch((e) => { console.log("ERR", e.message.slice(0, 300)); process.exit(1); });
