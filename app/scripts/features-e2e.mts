/**
 * Live end-to-end test of the owner-facing features against a running deployment.
 *   npm run features            (default target https://kulaya.vercel.app, override with APP_BASE=http://localhost:3000)
 * Covers: wallet sign-in, shop profile (+ validation and ownership), Telegram one-tap login (single use, forgery),
 * live payment detection (latency), stable customer numbering, loan history, network stats.
 * Needs KV_REST_API_* in .env.local (it creates a fake Telegram link in the same Redis, then removes it).
 */
import { createPublicClient, http, keccak256, toBytes, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { loadConfig } from "../server/config";
import { kv } from "../server/kv";
import { store } from "../server/store";

const BASE = process.env.APP_BASE ?? "https://kulaya.vercel.app";
const API = `${BASE}/api`;
const cfg = loadConfig(true);
const WARUNG = cfg.WARUNG_ADDRESS as Address;
const IDRX = cfg.IDRX_ADDRESS as Address;
const pub = createPublicClient({ chain: bscTestnet, transport: http(cfg.RPC_URL.split(",")[0]) });
const OWNER_WALLET = "0x7baa20eb0be196e7a05a841ffae4ded1a857503a"; // a real shop with a loan (user's)
const DEMO_SHOP = cfg.REDTEAM_MERCHANT as Address;

let failures = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); if (!ok) failures++; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function call(path: string, init?: RequestInit & { token?: string }) {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init?.headers as Record<string, string>) };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const r = await fetch(`${API}${path}`, { ...init, headers });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as any };
}

const warungDomain = { name: "Warung", version: "1", chainId: 97, verifyingContract: WARUNG } as const;
const nonceAbi = [{ type: "function", name: "nonces", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }, { type: "function", name: "relayNonces", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }] as const;
const inOneHour = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

async function signIn(acct: ReturnType<typeof privateKeyToAccount>): Promise<string> {
  const ch = await call("/auth", { method: "POST", body: JSON.stringify({ step: "challenge", address: acct.address }) });
  const signature = await acct.signMessage({ message: ch.body.message });
  const v = await call("/auth", { method: "POST", body: JSON.stringify({ step: "verify", address: acct.address, nonce: ch.body.nonce, signature }) });
  if (!v.body.token) throw new Error("sign-in failed: " + JSON.stringify(v.body));
  return v.body.token;
}

async function register(acct: ReturnType<typeof privateKeyToAccount>) {
  const deadline = inOneHour();
  const nonce = (await pub.readContract({ address: WARUNG, abi: nonceAbi, functionName: "relayNonces", args: [acct.address] })) as bigint;
  const sig = await acct.signTypedData({ domain: warungDomain, primaryType: "Register", types: { Register: [{ name: "merchant", type: "address" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] }, message: { merchant: acct.address, nonce, deadline } });
  return call("/relay", { method: "POST", body: JSON.stringify({ action: "register", merchant: acct.address, deadline: deadline.toString(), sig }) });
}

/** A brand-new customer wallet pays `amountRp` to `merchant` with zero BNB (faucet + signed payment through the relayer). */
async function customerPays(merchant: Address, amountRp: number, key: Hex = generatePrivateKey(), memo = "features e2e") {
  const acct = privateKeyToAccount(key);
  const f = await call("/relay", { method: "POST", body: JSON.stringify({ action: "faucet", address: acct.address }) });
  if (f.status !== 200) throw new Error("faucet: " + JSON.stringify(f.body));
  const amount = BigInt(amountRp) * 100n;
  const deadline = inOneHour();
  const nonce = (await pub.readContract({ address: WARUNG, abi: nonceAbi, functionName: "relayNonces", args: [acct.address] })) as bigint;
  const sig = await acct.signTypedData({
    domain: warungDomain, primaryType: "Pay",
    types: { Pay: [{ name: "payer", type: "address" }, { name: "merchant", type: "address" }, { name: "amount", type: "uint256" }, { name: "memoHash", type: "bytes32" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
    message: { payer: acct.address, merchant, amount, memoHash: keccak256(toBytes(memo)), nonce, deadline },
  });
  const pn = (await pub.readContract({ address: IDRX, abi: nonceAbi, functionName: "nonces", args: [acct.address] })) as bigint;
  const ps = await acct.signTypedData({
    domain: { name: "Mock IDRX", version: "1", chainId: 97, verifyingContract: IDRX }, primaryType: "Permit",
    types: { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
    message: { owner: acct.address, spender: WARUNG, value: amount, nonce: pn, deadline },
  });
  const r = await call("/relay", { method: "POST", body: JSON.stringify({ action: "pay", payer: acct.address, merchant, amount: amount.toString(), memo, deadline: deadline.toString(), sig, permit: { deadline: deadline.toString(), v: parseInt(ps.slice(130, 132), 16), r: `0x${ps.slice(2, 66)}`, s: `0x${ps.slice(66, 130)}` } }) });
  if (r.status !== 200) throw new Error("pay: " + JSON.stringify(r.body));
  return { key, address: acct.address, hash: r.body.hash as string };
}

/** Poll the live feed until a sale with this tx hash shows up. Returns seconds taken, or null on timeout. */
async function waitForSale(merchant: Address, after: string, hash: string, timeoutS = 120) {
  const t0 = Date.now();
  let cursor = after;
  while (Date.now() - t0 < timeoutS * 1000) {
    const r = await call(`/payments?merchant=${merchant}&after=${cursor}`);
    const hit = r.body.sales?.find((s: any) => s.tx.toLowerCase() === hash.toLowerCase());
    if (hit) return { seconds: (Date.now() - t0) / 1000, sale: hit };
    if (r.body.head) cursor = String(r.body.head) > cursor ? cursor : cursor; // keep the ORIGINAL cursor so a sale in an already-scanned block is never skipped
    await sleep(2500);
  }
  return null;
}

console.log(`target: ${BASE}\n`);

// ── network stats ──
const agent = await call("/agent");
check("/api/agent exposes network stats", typeof agent.body.stats?.shops === "number" && agent.body.stats.shops >= 2, JSON.stringify(agent.body.stats));

// ── a fresh shop owner ──
const owner = privateKeyToAccount(generatePrivateKey());
const reg = await register(owner);
check("owner registers a shop gaslessly", reg.status === 200, JSON.stringify(reg.body).slice(0, 70));

// ── wallet sign-in + profile ──
const token = await signIn(owner);
check("wallet sign-in returns a session token", token.split(".").length === 2);
check("profile save without a session is refused", (await call("/profile", { method: "POST", body: JSON.stringify({ name: "Hacker Shop" }) })).status === 401);
check("profile with a link in the name is refused", (await call("/profile", { method: "POST", token, body: JSON.stringify({ name: "Beli di https://evil.example" }) })).status === 400);
check("profile with markup in the name is refused", (await call("/profile", { method: "POST", token, body: JSON.stringify({ name: "<script>alert(1)</script>" }) })).status === 400);
const save = await call("/profile", { method: "POST", token, body: JSON.stringify({ name: "Bakso Uji Kulaya", nickname: "Bu Uji" }) });
check("valid shop name and nickname are saved", save.status === 200 && save.body.name === "Bakso Uji Kulaya", JSON.stringify(save.body));
const pubProfile = await call(`/profile?merchant=${owner.address}&v=${Date.now()}`);
check("public profile shows the name but NOT the private nickname", pubProfile.body.name === "Bakso Uji Kulaya" && !("nickname" in pubProfile.body), JSON.stringify(pubProfile.body));
const ownProfile = await call(`/profile?merchant=${owner.address}`, { token });
check("owner's own session also sees the nickname", ownProfile.body.nickname === "Bu Uji");
const other = privateKeyToAccount(generatePrivateKey());
const otherToken = await signIn(other);
await call("/profile", { method: "POST", token: otherToken, body: JSON.stringify({ name: "Toko Orang Lain" }) });
check("another wallet's session cannot change this shop's profile", (await call(`/profile?merchant=${owner.address}&v=${Date.now()}`)).body.name === "Bakso Uji Kulaya");

// ── Telegram one-tap login ──
const TG = "880000001";
await kv.set(`link:${TG}`, owner.address);
const code = await store.newLoginCode(TG);
const tl = await call("/auth/telegram", { method: "POST", body: JSON.stringify({ code }) });
check("Telegram login code is exchanged for a session of the linked wallet", tl.status === 200 && tl.body.address?.toLowerCase() === owner.address.toLowerCase());
check("that session works (private nickname visible)", (await call(`/profile?merchant=${owner.address}`, { token: tl.body.token })).body.nickname === "Bu Uji");
check("the same code cannot be used twice", (await call("/auth/telegram", { method: "POST", body: JSON.stringify({ code }) })).status === 401);
check("a made-up code is refused", (await call("/auth/telegram", { method: "POST", body: JSON.stringify({ code: "0".repeat(32) }) })).status === 401);
check("a malformed code is refused", (await call("/auth/telegram", { method: "POST", body: JSON.stringify({ code: "abc" }) })).status === 400);
const unlinked = await store.newLoginCode("880000002"); // a chat with no wallet linked
check("a chat without a linked wallet gets nothing", (await call("/auth/telegram", { method: "POST", body: JSON.stringify({ code: unlinked }) })).status === 401);

// ── live payments + customer numbering ──
const base = await call(`/payments?merchant=${owner.address}`);
check("payment feed gives a starting cursor", /^\d+$/.test(String(base.body.head)), String(base.body.head));
const p1 = await customerPays(owner.address, 25_000);
const hit1 = await waitForSale(owner.address, String(base.body.head), p1.hash);
check("a payment appears in the live feed", hit1 !== null, hit1 ? `${hit1.seconds.toFixed(1)}s after the relayer confirmed it` : "TIMEOUT");
check("first customer is numbered #1", hit1?.sale.customerNo === 1, `customerNo=${hit1?.sale.customerNo}`);
const p2 = await customerPays(owner.address, 10_000);
const hit2 = await waitForSale(owner.address, String(base.body.head), p2.hash);
check("a second customer is numbered #2", hit2?.sale.customerNo === 2, `customerNo=${hit2?.sale.customerNo}`);
const p3 = await customerPays(owner.address, 15_000, p1.key); // customer #1 again
const hit3 = await waitForSale(owner.address, String(base.body.head), p3.hash);
check("a returning customer keeps their number (#1)", hit3?.sale.customerNo === 1, `customerNo=${hit3?.sale.customerNo}`);
const sales = await call(`/sales?merchant=${owner.address}&limit=10`);
check("/api/sales carries customer numbers", sales.body.sales?.length >= 3 && sales.body.sales.every((s: any) => s.customerNo >= 1));
check("no payments are missed or duplicated", new Set(sales.body.sales.map((s: any) => s.tx)).size === 3);

// ── loan history ──
const none = await call(`/loans?merchant=${owner.address}`);
check("a shop with no loans has an empty history", Array.isArray(none.body.loans) && none.body.loans.length === 0);
const real = await call(`/loans?merchant=${OWNER_WALLET}`);
check("a real shop's loan history is returned newest first", real.body.loans?.length >= 1 && real.body.loans.every((l: any) => l.merchant.toLowerCase() === OWNER_WALLET), real.body.loans?.map((l: any) => `#${l.id}:${l.derived}`).join(" "));
const demo = await call(`/loans?merchant=${DEMO_SHOP}`);
check("the demo shop shows its repaid loan", demo.body.loans?.some((l: any) => l.derived === "Repaid"), demo.body.loans?.map((l: any) => `#${l.id}:${l.derived}`).join(" "));

// ── Telegram bot commands, driven through the real handlers with a stubbed Telegram API ──
{
  const { buildBot } = await import("../server/telegram");
  const sent: { method: string; payload: any }[] = [];
  const bot = buildBot();
  bot.botInfo = { id: 1, is_bot: true, first_name: "Kulaya", username: "KulayaBot", can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false, has_main_web_app: false } as any;
  bot.api.config.use(async (_prev, method, payload) => { sent.push({ method, payload }); return { ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } } as any; });
  const say = async (id: number, text: string) => {
    sent.length = 0;
    await bot.handleUpdate({ update_id: Math.floor(Math.random() * 1e9), message: { message_id: 1, date: 0, chat: { id, type: "private", first_name: "t" }, from: { id, is_bot: false, first_name: "t" }, text, entities: text.startsWith("/") ? [{ offset: 0, length: text.split(" ")[0].length, type: "bot_command" }] : [] } } as any);
    return sent.filter((x) => x.method === "sendMessage").map((x) => x.payload);
  };
  const TGB = 880000003;
  await kv.set(`link:${TGB}`, owner.address);
  const masuk = await say(TGB, "/masuk");
  const btn = masuk.at(-1)?.reply_markup?.inline_keyboard?.[0]?.[0];
  const link: string = btn?.url ?? "";
  check("/masuk replies with a one-tap login button", /\/masuk\?t=[0-9a-f]{32}$/.test(link), link.replace(/t=[0-9a-f]{32}/, "t=<code>"));
  check("/masuk warns the link is single-use and short-lived", /10 menit/.test(masuk.at(-1)?.text ?? "") && /sekali/.test(masuk.at(-1)?.text ?? ""));
  const viaBot = await call("/auth/telegram", { method: "POST", body: JSON.stringify({ code: link.split("t=")[1] }) });
  check("the code from the bot's button logs in the right wallet", viaBot.status === 200 && viaBot.body.address?.toLowerCase() === owner.address.toLowerCase());
  const unl = await say(880000004, "/masuk");
  check("/masuk from an unlinked chat asks to link a wallet first (no login code)", /Hubungkan dompet/.test(unl.at(-1)?.text ?? "") && !/masuk\?t=/.test(JSON.stringify(unl)));
  await call("/profile", { method: "POST", token, body: JSON.stringify({ name: "Bakso Uji Kulaya", nickname: "Bu Uji" }) });
  const start = await say(TGB, "/start");
  check("/start greets a linked owner by their nickname", start.some((m) => /Bu Uji/.test(m.text ?? "")), start.map((m) => (m.text ?? "").slice(0, 60)).join(" | "));
  await kv.del(`link:${TGB}`);
}

// cleanup of test data
await kv.del(`link:${TG}`); await kv.del(`profile:${owner.address.toLowerCase()}`); await kv.del(`profile:${other.address.toLowerCase()}`);
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
