const { chromium } = require("playwright-core");
const { execSync } = require("child_process");
const APP = process.cwd(); // run from app/
const SP = require("path").join(process.cwd(), "e2e", ".shots");
require("fs").mkdirSync(SP, { recursive: true });
(async () => {
  const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
  const key = generatePrivateKey(); const acct = privateKeyToAccount(key);
  console.log("test shop wallet:", acct.address);
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message.slice(0, 160)));
  await p.exposeFunction("__rpc", async (method, params) => {
    if (method === "eth_requestAccounts") { global.__connected = true; return [acct.address]; }
    if (method === "eth_accounts") return global.__connected ? [acct.address] : [];
    if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
    if (method === "personal_sign") { const hex = params[0]; const msg = Buffer.from(hex.slice(2), "hex").toString("utf8"); return acct.signMessage({ message: msg }); }
    if (method === "eth_signTypedData_v4") { const t = JSON.parse(params[1]); const { EIP712Domain, ...types } = t.types; return acct.signTypedData({ domain: t.domain, types, primaryType: t.primaryType, message: t.message }); }
    throw new Error("unsupported wallet method " + method);
  });
  await p.addInitScript(() => { window.ethereum = { request: ({ method, params }) => window.__rpc(method, params), on() {}, removeListener() {} }; });
  const shot = (n) => p.screenshot({ path: `${SP}/${n}.png`, fullPage: true });

  await p.goto("https://kulaya.vercel.app/dashboard", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Connect your shop wallet" }).click();
  await p.getByText("Register your shop").first().waitFor({ timeout: 60000 });
  console.log("1. connected, shows register screen");
  await p.getByRole("button", { name: /Register my shop/ }).click();
  await p.getByText("Sales today (verified)").waitFor({ timeout: 120000 });
  console.log("2. gasless registration worked, dashboard visible");
  await shot("01-empty-dashboard");

  console.log("3. seeding customer payments to the new shop...");
  execSync(`npm run seed -- day ${acct.address}`, { cwd: APP, stdio: "pipe", timeout: 580000 });
  await p.waitForTimeout(22000); // dashboard polls every 20s
  const kpi = await p.locator(".stat").allInnerTexts();
  console.log("   KPIs:", kpi.map((x) => x.replace(/\n/g, " ")).join(" | "));
  await shot("02-dashboard-with-sales");

  console.log("4. chat sign-in");
  await p.getByRole("button", { name: "Sign in to chat" }).click();
  await p.getByPlaceholder("Tulis pesan…").waitFor({ timeout: 60000 });
  await p.getByPlaceholder("Tulis pesan…").fill("berapa total penjualan saya?");
  await p.getByRole("button", { name: "Send" }).click();
  await p.waitForFunction(() => !document.body.innerText.includes("Sedang berpikir") && document.querySelectorAll(".msg.ai .bubble").length >= 2, null, { timeout: 120000 });
  console.log("   AI answer 1:", (await p.locator(".msg.ai .bubble").nth(1).innerText()).slice(0, 200));

  await p.getByRole("button", { name: "Ask the AI for an offer" }).click();
  await p.getByText("Review & accept the loan").waitFor({ timeout: 120000 });
  console.log("   AI created a loan offer, button shown in chat");
  await p.waitForTimeout(22000);
  await shot("03-offer");
  await p.getByRole("button", { name: /^Accept Rp/ }).click();
  await p.getByText(/Accepted\./).waitFor({ timeout: 120000 });
  console.log("5. loan accepted from the dashboard (gasless)");
  await p.waitForTimeout(22000);
  console.log("   loan chip:", await p.locator(".chip").filter({ hasText: "Loan #" }).innerText());
  await shot("04-active-loan");
  await b.close();
})().catch((e) => { console.log("TEST FAILED:", e.message.slice(0, 300)); process.exit(1); });
