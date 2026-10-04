const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage();
  p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message.slice(0, 150)));
  const M = "0x7FeaeE8CFcC8D0E79329A864Fcf9758F4DDd98C6";
  await p.goto(`https://kulaya.vercel.app/pay/${M}?amount=50000&note=demo%20wallet%20test`, { waitUntil: "networkidle" });
  console.log("QRIS notice visible:", await p.getByText("not QRIS").isVisible());
  console.log("wallet deep links (no extension):", await p.getByRole("link", { name: "MetaMask" }).isVisible());
  await p.getByRole("button", { name: /Pay with demo wallet/ }).click();
  const ok = p.getByText("Paid.");
  const bad = p.locator(".bad");
  await Promise.race([ok.waitFor({ timeout: 120000 }), bad.first().waitFor({ timeout: 120000 })]);
  console.log("result:", (await ok.isVisible()) ? "PAID " + (await p.locator("a", { hasText: "View transaction" }).getAttribute("href")) : "ERROR " + (await bad.first().innerText()));
  await b.close();
})().catch((e) => { console.log("TEST FAILED:", e.message.slice(0, 200)); process.exit(1); });
