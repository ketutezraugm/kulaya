const { chromium } = require("playwright-core");
const { execSync } = require("child_process");
const APP = process.cwd(); // run from app/
const SP = require("path").join(process.cwd(), "e2e", ".shots");
require("fs").mkdirSync(SP + "/design-shots", { recursive: true });
const BASE = process.env.APP_BASE || "https://kulaya.vercel.app";
let fails = 0;
const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${x ? "  " + x : ""}`); if (!ok) fails++; };

(async () => {
  const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
  const acct = privateKeyToAccount(generatePrivateKey());
  console.log("test shop:", acct.address, "\n");
  const b = await chromium.launch({ channel: "chrome", headless: true });

  // ---- owner browser with a scripted wallet
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const owner = await ctx.newPage();
  owner.on("pageerror", (e) => console.log("OWNER PAGE ERROR:", e.message.slice(0, 140)));
  let connected = false;
  await owner.exposeFunction("__rpc", async (method, params) => {
    if (method === "eth_requestAccounts") { connected = true; return [acct.address]; }
    if (method === "eth_accounts") return connected ? [acct.address] : [];
    if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
    if (method === "personal_sign") return acct.signMessage({ message: Buffer.from(params[0].slice(2), "hex").toString("utf8") });
    if (method === "eth_signTypedData_v4") { const t = JSON.parse(params[1]); const { EIP712Domain, ...types } = t.types; return acct.signTypedData({ domain: t.domain, types, primaryType: t.primaryType, message: t.message }); }
    throw new Error("unsupported " + method);
  });
  await owner.addInitScript(() => { window.ethereum = { request: ({ method, params }) => window.__rpc(method, params), on() {}, removeListener() {} }; });

  await owner.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await owner.getByRole("button", { name: "Connect your shop wallet" }).click();
  await owner.getByRole("button", { name: /Register my shop/ }).click();
  await owner.getByText("Sales today (verified)").waitFor({ timeout: 120000 });
  check("owner connects and registers (gasless)", true);

  // ---- general QR (no amount) + a customer paying through it
  await owner.getByRole("button", { name: "Customer enters amount" }).click();
  check("general-QR mode shows a QR and waits for payment", await owner.getByText("Menunggu pembayaran").isVisible());
  const generalUrl = `${BASE}/pay/${acct.address}`;
  const cust = await ctx.newPage(); // same browser, but the customer uses the built-in demo wallet (no wallet connect)
  await cust.addInitScript(() => { delete window.ethereum; });
  await cust.goto(generalUrl, { waitUntil: "networkidle" });
  const payBtn = cust.getByRole("button", { name: /Pay with demo wallet/ });
  check("amount-less pay page asks the customer for an amount", await cust.getByLabel("Amount in rupiah").isVisible());
  check("pay button is disabled until a valid amount is typed", await payBtn.isDisabled());
  await cust.getByLabel("Amount in rupiah").fill("1000");
  check("amounts under Rp 5.000 are explained, not sent", (await cust.getByText("Minimum payment is").isVisible()) && (await payBtn.isDisabled()));
  await cust.getByLabel("Amount in rupiah").fill("20000");
  await payBtn.click();
  await cust.getByText("Paid.").waitFor({ timeout: 120000 });
  check("customer typed an amount and paid through the general QR", true);
  await owner.getByText("Pembayaran diterima!").waitFor({ timeout: 60000 });
  const banner = await owner.locator("[role=status]").innerText();
  check("owner's screen shows 'Pembayaran diterima!' live", /Rp 20\.000/.test(banner) && /Pelanggan #1/.test(banner), banner.replace(/\n/g, " | "));
  await owner.screenshot({ path: `${SP}/design-shots/ui-received.png` });

  // ---- Telegram one-tap login in a fresh browser: no wallet at all
  const code = execSync(`npx tsx --env-file=.env.local scripts/login-code.mts ${acct.address}`, { cwd: APP }).toString().trim().split("\n").pop();
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const tg = await ctx2.newPage();
  tg.on("pageerror", (e) => console.log("TG PAGE ERROR:", e.message.slice(0, 140)));
  await tg.goto(`${BASE}/masuk?t=${code}`, { waitUntil: "networkidle" });
  await tg.waitForURL(/\/dashboard/, { timeout: 30000 });
  await tg.getByText("Sales today (verified)").waitFor({ timeout: 60000 });
  check("Telegram login lands on the owner's dashboard without any wallet", true);
  const txt = await tg.locator("body").innerText();
  check("customers appear as friendly numbers (Pelanggan #1), not addresses", /Pelanggan #1/.test(txt));
  check("a viewer without a wallet still sees the shop's real sales", /Rp 20\.000/.test(txt));
  // reusing the link must fail
  const tg2 = await (await b.newContext()).newPage();
  await tg2.goto(`${BASE}/masuk?t=${code}`, { waitUntil: "networkidle" });
  await tg2.getByText(/sudah dipakai atau kedaluwarsa/).waitFor({ timeout: 30000 });
  check("the one-tap link cannot be reused", true);

  // ---- name the shop from the Telegram session (no wallet needed)
  await tg.getByText("Name your shop").click();
  await tg.getByPlaceholder("e.g. Bakso Bu Sri").fill("Bakso Uji UI");
  await tg.getByPlaceholder("e.g. Bu Sri").fill("Bu Uji");
  await tg.getByRole("button", { name: "Save" }).click();
  await tg.getByRole("heading", { name: "Bakso Uji UI" }).waitFor({ timeout: 30000 });
  check("shop name saved from a Telegram session and shown as the page title", true);
  await tg.screenshot({ path: `${SP}/design-shots/ui-telegram-session.png`, fullPage: true });

  // ---- the public shop page also shows it
  const pubName = await (await fetch(`${BASE}/api/profile?merchant=${acct.address}&v=${Date.now()}`)).json();
  check("public profile API returns the name", pubName.name === "Bakso Uji UI" && !("nickname" in pubName));

  await b.close();
  // (test data is tiny and keyed by a throwaway wallet; the fake chat link is overwritten by the next run)
  console.log(`\n${fails === 0 ? "ALL PASSED" : fails + " FAILED"}`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("TEST ERROR:", e.message.slice(0, 300)); process.exit(1); });
