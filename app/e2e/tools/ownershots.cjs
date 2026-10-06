// Dev helper: log in as a shop through a Telegram login code and screenshot the owner screens (phone width).
const { chromium } = require("playwright-core");
const { execSync } = require("child_process");
const BASE = process.env.APP_BASE || "http://localhost:3000";
const M = process.env.SHOP || "0x7FeaeE8CFcC8D0E79329A864Fcf9758F4DDd98C6";
(async () => {
  const code = execSync(`npx tsx --env-file=.env.local scripts/login-code.mts ${M}`).toString().trim().split("\n").pop();
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: Number(process.env.W || 390), height: 844 } })).newPage();
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 200)));
  await p.goto(`${BASE}/masuk?t=${code}`); await p.waitForURL(/\/toko$/);
  for (const r of (process.argv[2] || "toko,toko/terima,toko/modal,toko/riwayat,toko/tanya,bantuan,toko/poster").split(",")) {
    await p.goto(`${BASE}/${r}`, { waitUntil: "load" }); await p.waitForTimeout(6000);
    await p.screenshot({ path: `e2e/.shots/o-${r.replace(/\W/g, "_")}.png`, fullPage: true });
  }
  await b.close();
})();
