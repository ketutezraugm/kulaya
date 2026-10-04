import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { completeChallenge, newChallenge, signToken, verifyToken } from "./session";

const SECRET = "test-secret-at-least-32-characters-long";
const ADDR = "0x7baa20eb0be196e7a05a841ffae4ded1a857503a";

test("token round-trips and is bound to the address", () => {
  assert.equal(verifyToken(signToken(ADDR, SECRET), SECRET), ADDR);
});

test("forged, tampered, wrong-secret and expired tokens are rejected", () => {
  const t = signToken(ADDR, SECRET);
  const [p, s] = t.split(".");
  const other = Buffer.from(JSON.stringify({ a: "0x" + "1".repeat(40), exp: 9_999_999_999 })).toString("base64url");
  assert.equal(verifyToken(`${other}.${s}`, SECRET), null, "payload swapped, signature reused");
  assert.equal(verifyToken(`${p}.${s.slice(0, -2)}AA`, SECRET), null, "signature altered");
  assert.equal(verifyToken(t, "another-secret-another-secret-123456"), null, "wrong secret");
  assert.equal(verifyToken(signToken(ADDR, SECRET, Date.now() - 13 * 3600 * 1000), SECRET), null, "expired");
  for (const junk of ["", "x", "a.b", "..", null, undefined]) assert.equal(verifyToken(junk as any, SECRET), null);
});

test("wallet signature challenge: valid signature works exactly once", async () => {
  const acct = privateKeyToAccount(generatePrivateKey());
  const { nonce, message } = await newChallenge(acct.address);
  const signature = await acct.signMessage({ message });
  const token = await completeChallenge(acct.address, nonce, signature, SECRET);
  assert.equal(verifyToken(token, SECRET), acct.address.toLowerCase());
  assert.equal(await completeChallenge(acct.address, nonce, signature, SECRET), null, "nonce cannot be replayed");
});

test("someone else's signature, or a nonce issued to another address, is refused", async () => {
  const victim = privateKeyToAccount(generatePrivateKey());
  const attacker = privateKeyToAccount(generatePrivateKey());
  const { nonce, message } = await newChallenge(victim.address);
  const forged = await attacker.signMessage({ message });
  assert.equal(await completeChallenge(victim.address, nonce, forged, SECRET), null, "attacker signed the victim's challenge");
  const c2 = await newChallenge(attacker.address);
  const sig2 = await attacker.signMessage({ message: c2.message });
  assert.equal(await completeChallenge(victim.address, c2.nonce, sig2, SECRET), null, "nonce belongs to a different address");
});

test("the login method is recorded in the token without changing verification", async () => {
  const t = signToken(ADDR, SECRET, Date.now(), "telegram");
  assert.equal(verifyToken(t, SECRET), ADDR);
  const claim = JSON.parse(Buffer.from(t.split(".")[0], "base64url").toString());
  assert.equal(claim.m, "telegram");
  assert.equal(JSON.parse(Buffer.from(signToken(ADDR, SECRET).split(".")[0], "base64url").toString()).m, "wallet");
});
