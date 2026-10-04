// QA: no horizontal scroll at 360px (phone) on the public owner screens and the protocol site at 390px.
const { chromium } = require("playwright-core");
const BASE = process.env.APP_BASE || "http://localhost:3000";
const M = "0x7FeaeE8CFcC8D0E79329A864Fcf9758F4DDd98C6";
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  let bad = 0;
  for (const [w, paths] of [[360, ["/", "/mulai", "/masuk", `/bayar/${M}?amount=50000`, `/bayar/${M}`, `/t/${M}`, "/bantuan", "/nope"]], [390, ["/protocol", "/protocol/redteam", "/protocol/agent", "/protocol/pool", "/protocol/contracts", "/protocol/gasless", "/protocol/docs"]]]) {
    for (const path of paths) {
      const p = await (await b.newContext({ viewport: { width: w, height: 800 } })).newPage();
      await p.goto(BASE + path, { waitUntil: "load" });
      await p.waitForTimeout(2500);
      const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, wide: [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 30)) }));
      const ok = o.sw <= o.cw;
      if (!ok) bad++;
      console.log(`${ok ? "PASS" : "FAIL"} ${w}px ${path}`, ok ? "" : JSON.stringify(o));
      await p.context().close();
    }
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
