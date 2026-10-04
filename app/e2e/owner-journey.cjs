const { chromium } = require("playwright-core");
const { execSync } = require("child_process");
const { BASE, scriptedWallet, register } = require("./lib.cjs");
const APP = process.cwd(); // run from app/
const SP = require("path").join(process.cwd(), "e2e", ".shots");
require("fs").mkdirSync(SP, { recursive: true });
(async () => {
  const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
  const acct = privateKeyToAccount(generatePrivateKey());
  console.log("test shop wallet:", acct.address, "on", BASE);
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message.slice(0, 160)));
  await scriptedWallet(p, acct);
  const shot = (n) => p.screenshot({ path: `${SP}/${n}.png`, fullPage: true });

  await register(p, "Warung Uji Jalan", "Bu Jalan");
  console.log("1. tutorial skipped, wallet connected, shop named and registered gasless");
  await shot("01-registered");

  await p.goto(`${BASE}/toko`, { waitUntil: "load" });
  await p.getByTestId("sales-card").waitFor({ timeout: 60000 });
  console.log("2. Beranda:", (await p.getByTestId("greeting-name").innerText()), "| capital state:", await p.locator("[data-testid^=capital-]").getAttribute("data-testid"));
  await shot("02-beranda-empty");

  console.log("3. seeding customer payments to the new shop...");
  execSync(`npm run seed -- day ${acct.address}`, { cwd: APP, stdio: "pipe", timeout: 580000 });
  await p.waitForTimeout(22000); // the shop data polls every 20s
  await p.reload({ waitUntil: "load" });
  await p.getByTestId("sales-card").waitFor({ timeout: 60000 });
  console.log("   capital state now:", await p.locator("[data-testid^=capital-]").getAttribute("data-testid"));
  await shot("03-beranda-with-sales");

  console.log("4. ask Kulaya (chat uses the session from setup)");
  await p.goto(`${BASE}/toko/tanya`, { waitUntil: "load" });
  await p.getByTestId("chat-input").waitFor({ timeout: 60000 });
  await p.getByTestId("chat-input").fill("berapa total penjualan saya?");
  await p.getByTestId("chat-send").click();
  await p.getByTestId("msg-ai").first().waitFor({ timeout: 120000 });
  console.log("   AI answer:", (await p.getByTestId("msg-ai").first().innerText()).slice(0, 200));
  await shot("04-chat");

  console.log("5. request a loan offer on /toko/modal");
  await p.goto(`${BASE}/toko/modal`, { waitUntil: "load" });
  await p.getByTestId("request-offer").click();
  await p.getByTestId("offer-terms").waitFor({ timeout: 180000 });
  console.log("   offer terms:", (await p.getByTestId("offer-terms").innerText()).replace(/\n/g, " | "));
  await shot("05-offer");
  await p.getByTestId("accept-offer").click();
  await p.getByTestId("accept-confirm").click();
  await p.getByTestId("accepted").waitFor({ timeout: 180000 });
  console.log("6. loan accepted from the Modal screen (gasless)");
  await p.waitForTimeout(3000);
  await shot("06-active-loan");
  await b.close();
})().catch((e) => { console.log("TEST FAILED:", e.message.slice(0, 400)); process.exit(1); });
