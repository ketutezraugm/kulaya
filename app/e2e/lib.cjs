// Shared bits of the Playwright journeys: a scripted wallet (imitates MetaMask) and the /mulai setup flow in Bahasa.
const BASE = process.env.APP_BASE || "https://kulaya.vercel.app";

async function scriptedWallet(page, acct) {
  let connected = false;
  await page.exposeFunction("__rpc", async (method, params) => {
    if (method === "eth_requestAccounts") { connected = true; return [acct.address]; }
    if (method === "eth_accounts") return connected ? [acct.address] : [];
    if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
    if (method === "personal_sign") return acct.signMessage({ message: Buffer.from(params[0].slice(2), "hex").toString("utf8") });
    if (method === "eth_signTypedData_v4") { const t = JSON.parse(params[1]); const { EIP712Domain, ...types } = t.types; return acct.signTypedData({ domain: t.domain, types, primaryType: t.primaryType, message: t.message }); }
    throw new Error("unsupported wallet method " + method);
  });
  await page.addInitScript(() => { window.ethereum = { request: ({ method, params }) => window.__rpc(method, params), on() {}, removeListener() {} }; });
}

/** New owner: skip the tutorial, connect, name the shop, register (gasless). Ends on the "Toko Anda sudah terdaftar!" screen. */
async function register(page, name = "Bakso Uji UI", nick = "Bu Uji") {
  await page.goto(`${BASE}/mulai`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Lewati" }).click();
  await page.getByTestId("have-wallet").click();
  await page.getByTestId("connect-ok").click();
  await page.getByTestId("shop-name").fill(name);
  await page.getByTestId("shop-nick").fill(nick);
  await page.getByTestId("save-name").click();
  await page.getByTestId("register").click();
  await page.getByTestId("setup-done").waitFor({ timeout: 120000 });
}

module.exports = { BASE, scriptedWallet, register };
