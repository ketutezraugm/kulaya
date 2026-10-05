// Smoke: with NEXT_PUBLIC_WC_PROJECT_ID set, a phone without a wallet gets the WalletConnect picker (no real connection is made).
const { chromium } = require("playwright-core");
const { BASE } = require("./lib.cjs");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const wc = [];
  p.on("request", (r) => { if (/walletconnect|reown/.test(r.url())) wc.push(r.url().slice(0, 90)); });
  p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message.slice(0, 160)));
  await p.goto(`${BASE}/mulai`, { waitUntil: "load" });
  await p.getByRole("button", { name: "Lewati" }).click();
  await p.getByTestId("have-wallet").click();
  await p.getByTestId("connect-ok").click();
  await p.waitForTimeout(8000);
  console.log("walletconnect requests:", wc.length, wc[0] ?? "");
  console.log("modal element:", await p.locator("w3m-modal, wcm-modal, appkit-modal, [id*=w3m], [id*=walletconnect]").count());
  console.log("screen text:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 160));
  await b.close();
})();
