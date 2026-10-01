/**
 * Proves the gasless path end to end against the running bot's /relay endpoint:
 * a brand-new wallet with ZERO BNB gets test IDRX, pays a shop, and registers its own shop, only by signing.
 * Also tries the attacks a malicious relayer/user would: tampered payment, replayed signature.
 *   (bot must be running)  npm run gasless
 */
import { createWalletClient, keccak256, toBytes, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { loadConfig } from "../src/config.js";
import { makeChain, transportFor, erc20Abi, warungAbi } from "../src/chain.js";
import { rupiah } from "../src/util.js";

const cfg = loadConfig(true);
const c = makeChain(cfg);
const API = `http://localhost:${cfg.PORT}`;
const WARUNG = cfg.WARUNG_ADDRESS as Address;
const IDRX = cfg.IDRX_ADDRESS as Address;
const merchant = cfg.REDTEAM_MERCHANT as Address;

const key = generatePrivateKey();
const user = privateKeyToAccount(key);
const w = createWalletClient({ account: user, chain: bscTestnet, transport: transportFor(cfg) });
const dom = { name: "Warung", version: "1", chainId: 97, verifyingContract: WARUNG } as const;
const post = async (body: object) => { const r = await fetch(`${API}/relay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.json()) as any }; };
const bal = (a: Address) => c.publicClient.readContract({ address: IDRX, abi: erc20Abi, functionName: "balanceOf", args: [a] }) as Promise<bigint>;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`); if (!ok) process.exitCode = 1; };

console.log("new user:", user.address, "| tBNB:", await c.publicClient.getBalance({ address: user.address }), "(zero)");

// 1. faucet: free mock IDRX via the relayer
let r = await post({ action: "faucet", address: user.address });
check("faucet mints IDRX with zero BNB", r.status === 200, JSON.stringify(r.body).slice(0, 80));
console.log("   balance:", rupiah(await bal(user.address)));

// 2. gasless payment: sign Pay + Permit, relayer submits
const amount = 50_000n * 100n, memo = "gasless e2e";
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
const nonce = (await c.read("relayNonces", [user.address])) as bigint;
const payTypes = { Pay: [{ name: "payer", type: "address" }, { name: "merchant", type: "address" }, { name: "amount", type: "uint256" }, { name: "memoHash", type: "bytes32" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] } as const;
const sig = await w.signTypedData({ domain: dom, types: payTypes, primaryType: "Pay", message: { payer: user.address, merchant, amount, memoHash: keccak256(toBytes(memo)), nonce, deadline } });
const permitNonce = (await c.publicClient.readContract({ address: IDRX, abi: [{ type: "function", name: "nonces", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }], functionName: "nonces", args: [user.address] })) as bigint;
const ps = await w.signTypedData({
  domain: { name: "Mock IDRX", version: "1", chainId: 97, verifyingContract: IDRX }, primaryType: "Permit",
  types: { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
  message: { owner: user.address, spender: WARUNG, value: amount, nonce: permitNonce, deadline },
});
const permit = { deadline: deadline.toString(), v: parseInt(ps.slice(130, 132), 16), r: `0x${ps.slice(2, 66)}`, s: `0x${ps.slice(66, 130)}` };
const payBody = { action: "pay", payer: user.address, merchant, amount: amount.toString(), memo, deadline: deadline.toString(), sig, permit };

const merchantBefore = await bal(merchant);
// attack A: relayer tampers with the amount -> contract must refuse
r = await post({ ...payBody, amount: (amount * 2n).toString() });
check("tampered amount is rejected by the contract", r.status === 400 && /BadSignature/.test(JSON.stringify(r.body)), JSON.stringify(r.body.revert ?? r.body).slice(0, 90));
// attack B: relayer redirects to another merchant
r = await post({ ...payBody, merchant: user.address });
check("redirected merchant is rejected", r.status === 400, JSON.stringify(r.body.revert ?? r.body).slice(0, 90));
// the honest message goes through
r = await post(payBody);
check("signed payment is relayed with zero BNB", r.status === 200, JSON.stringify(r.body).slice(0, 90));
check("merchant received exactly the signed amount", (await bal(merchant)) - merchantBefore === amount - (((amount) * 0n)), `(+${rupiah((await bal(merchant)) - merchantBefore)})`);
// attack C: replay the same signature
r = await post(payBody);
check("replayed signature is rejected", r.status === 400, JSON.stringify(r.body.revert ?? r.body).slice(0, 90));

// 3. gasless merchant registration
const rn = (await c.read("relayNonces", [user.address])) as bigint;
const rsig = await w.signTypedData({ domain: dom, primaryType: "Register", types: { Register: [{ name: "merchant", type: "address" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] }, message: { merchant: user.address, nonce: rn, deadline } });
r = await post({ action: "register", merchant: user.address, deadline: deadline.toString(), sig: rsig });
check("gasless shop registration", r.status === 200, JSON.stringify(r.body).slice(0, 90));
const m = (await c.read("merchants", [user.address])) as any;
check("shop is registered on-chain", m[0] === true);

console.log("user tBNB at the end:", await c.publicClient.getBalance({ address: user.address }), "(still zero)");
