const { chromium } = require("playwright-core");
const { BASE } = require("./lib.cjs");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message.slice(0, 150)));
  const M = "0x7FeaeE8CFcC8D0E79329A864Fcf9758F4DDd98C6";
  await p.goto(`${BASE}/bayar/${M}?amount=50000&note=demo%20wallet%20test`, { waitUntil: "load" });
  await p.getByTestId("pay-amount").waitFor();
  console.log("amount shown:", await p.getByTestId("pay-amount").innerText());
  console.log("QRIS notice visible:", await p.getByText("Ini bukan QRIS").isVisible());
  console.log("wallet deep links (only without WalletConnect; hidden now that it is configured):", await p.getByTestId("wallet-links").isVisible().catch(() => false));
  await p.getByTestId("pay-demo").click();
  const ok = p.getByTestId("paid");
  const bad = p.getByTestId("pay-error");
  await Promise.race([ok.waitFor({ timeout: 120000 }), bad.waitFor({ timeout: 120000 })]);
  console.log("result:", (await ok.isVisible()) ? "PAID " + (await p.getByRole("link", { name: "Lihat bukti transaksi" }).getAttribute("href")) : "ERROR " + (await bad.innerText()));
  await b.close();
})().catch((e) => { console.log("TEST FAILED:", e.message.slice(0, 200)); process.exit(1); });
