const { chromium } = require("playwright-core");
const { execSync } = require("child_process");
const { BASE, scriptedWallet, register } = require("./lib.cjs");
const APP = process.cwd(); // run from app/
const SP = require("path").join(process.cwd(), "e2e", ".shots");
require("fs").mkdirSync(SP + "/design-shots", { recursive: true });
let fails = 0;
const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${x ? "  " + x : ""}`); if (!ok) fails++; };

(async () => {
  const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
  const acct = privateKeyToAccount(generatePrivateKey());
  console.log("test shop:", acct.address, "on", BASE, "\n");
  const b = await chromium.launch({ channel: "chrome", headless: true });

  // ---- owner on a phone-sized screen with a scripted wallet
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await ctx.newPage();
  owner.on("pageerror", (e) => console.log("OWNER PAGE ERROR:", e.message.slice(0, 140)));
  await scriptedWallet(owner, acct);
  await register(owner);
  check("owner sets up: connect, name, register (gasless), in Bahasa", await owner.getByText("Toko Anda sudah terdaftar!").isVisible());
  await owner.screenshot({ path: `${SP}/design-shots/ui-registered.png` });

  // ---- general QR (no amount) + a customer paying through it
  await owner.getByTestId("setup-done").click(); // "Coba terima pembayaran pertama"
  await owner.getByTestId("mode-general").click();
  await owner.getByTestId("make-qr").click();
  await owner.getByTestId("qr-box").waitFor();
  check("general-QR mode shows a QR and waits for payment", await owner.getByTestId("waiting").isVisible());
  const cust = await ctx.newPage(); // same browser, but the customer uses the built-in demo wallet (no wallet connect)
  await cust.addInitScript(() => { delete window.ethereum; });
  await cust.goto(`${BASE}/bayar/${acct.address}`, { waitUntil: "load" });
  const payBtn = cust.getByTestId("pay-demo");
  check("amount-less pay page asks the customer for an amount", await cust.getByTestId("amount-input").isVisible());
  check("pay button is disabled until a valid amount is typed", await payBtn.isDisabled());
  await cust.getByTestId("amount-input").fill("1000");
  check("amounts under Rp 5.000 are explained, not sent", (await cust.getByTestId("amount-hint").innerText()).includes("Minimal Rp 5.000") && (await payBtn.isDisabled()));
  await cust.getByTestId("amount-input").fill("20000");
  await payBtn.click();
  await cust.getByTestId("paid").waitFor({ timeout: 120000 });
  check("customer typed an amount and paid through the general QR", true);
  await owner.getByTestId("received").waitFor({ timeout: 60000 });
  const banner = await owner.getByTestId("received").innerText();
  check("owner's screen shows 'Pembayaran diterima!' live", /Pembayaran diterima!/.test(banner) && /Rp 20\.000/.test(banner) && /Pelanggan #1/.test(banner), banner.replace(/\n/g, " | "));
  await owner.screenshot({ path: `${SP}/design-shots/ui-received.png` });

  // ---- Telegram one-tap login in a fresh browser: no wallet at all
  const code = execSync(`npx tsx --env-file=.env.local scripts/login-code.mts ${acct.address}`, { cwd: APP }).toString().trim().split("\n").pop();
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const tg = await ctx2.newPage();
  tg.on("pageerror", (e) => console.log("TG PAGE ERROR:", e.message.slice(0, 140)));
  await tg.goto(`${BASE}/masuk?t=${code}`, { waitUntil: "load" });
  await tg.waitForURL(/\/toko$/, { timeout: 30000 });
  await tg.getByTestId("sales-card").waitFor({ timeout: 60000 });
  check("Telegram login lands on the owner's Beranda without any wallet", true);
  check("greets by the private nickname", (await tg.getByTestId("greeting-name").innerText()) === "Bu Uji");
  const txt = await tg.locator("body").innerText();
  check("customers appear as friendly numbers (Pelanggan #1), not addresses", /Pelanggan #1/.test(txt));
  check("a viewer without a wallet still sees the shop's real sales", /Rp 20\.000/.test(txt));
  const tg2 = await (await b.newContext()).newPage();
  await tg2.goto(`${BASE}/masuk?t=${code}`, { waitUntil: "load" });
  await tg2.getByTestId("masuk-error").waitFor({ timeout: 30000 });
  check("the one-tap link cannot be reused", /sudah dipakai atau kedaluwarsa/.test(await tg2.getByTestId("masuk-error").innerText()));

  // ---- change the shop name from the Telegram session (no wallet needed)
  await tg.getByTestId("open-edit").click();
  await tg.getByTestId("edit-name").fill("Bakso Uji UI 2");
  await tg.getByTestId("edit-save").click();
  await tg.getByText("Bakso Uji UI 2").first().waitFor({ timeout: 30000 });
  check("shop name edited from a Telegram session and shown on Beranda", true);
  await tg.screenshot({ path: `${SP}/design-shots/ui-telegram-session.png`, fullPage: true });

  // ---- the public profile API and old URLs
  const pubName = await (await fetch(`${BASE}/api/profile?merchant=${acct.address}&v=${Date.now()}`)).json();
  check("public profile API returns the name and no nickname", pubName.name === "Bakso Uji UI 2" && !("nickname" in pubName));
  const old = await fetch(`${BASE}/pay/${acct.address}?amount=10000`, { redirect: "manual" });
  check("old /pay/... link redirects to /bayar/... with its query", old.status === 308 && (old.headers.get("location") || "").includes(`/bayar/${acct.address}?amount=10000`), String(old.status));
  const pub = await ctx2.newPage();
  await pub.goto(`${BASE}/t/${acct.address}`, { waitUntil: "load" });
  await pub.getByTestId("profile-name").waitFor({ timeout: 60000 });
  check("public profile page shows the shop name", (await pub.getByTestId("profile-name").innerText()) === "Bakso Uji UI 2");

  await b.close();
  console.log(`\n${fails === 0 ? "ALL PASSED" : fails + " FAILED"}`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("TEST ERROR:", e.message.slice(0, 400)); process.exit(1); });
