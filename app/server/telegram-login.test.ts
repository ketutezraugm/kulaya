import { test } from "node:test";
import assert from "node:assert/strict";
import { store } from "./store";
import { kv } from "./kv";

const TG = "777000111", WALLET = "0x7baa20eb0be196e7a05a841ffae4ded1a857503a";

test("a login code works once, for the wallet linked to the requesting chat", async () => {
  await kv.set(`link:${TG}`, WALLET);
  const code = await store.newLoginCode(TG);
  assert.equal(await store.consumeLoginCode(code), WALLET);
  assert.equal(await store.consumeLoginCode(code), null, "a second use must fail");
});

test("unknown codes and unlinked chats are refused", async () => {
  assert.equal(await store.consumeLoginCode("0".repeat(32)), null);
  const code = await store.newLoginCode("999999999"); // chat with no linked wallet
  assert.equal(await store.consumeLoginCode(code), null);
});

test("two simultaneous exchanges of the same code: exactly one succeeds", async () => {
  await kv.set(`link:${TG}`, WALLET);
  const code = await store.newLoginCode(TG);
  const results = await Promise.all([store.consumeLoginCode(code), store.consumeLoginCode(code), store.consumeLoginCode(code)]);
  assert.equal(results.filter(Boolean).length, 1);
});
