// Dev helper: screenshot protocol pages in dark mode (desktop) and the mobile menu.
const { chromium } = require("playwright-core");
const { BASE } = require("../lib.cjs");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("kulaya_protocol_theme", "dark"));
  const p = await ctx.newPage();
  for (const r of ["protocol", "protocol/redteam"]) {
    await p.goto(`${BASE}/${r}`, { waitUntil: "load" }); await p.waitForTimeout(4000);
    await p.screenshot({ path: `e2e/.shots/dark-${r.replace(/\W/g, "_")}.png`, fullPage: r === "protocol" });
  }
  const m = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await m.goto(`${BASE}/protocol`, { waitUntil: "load" });
  await m.getByRole("button", { name: "Open menu" }).click();
  await m.screenshot({ path: "e2e/.shots/mobile-menu.png" });
  await b.close();
})();
