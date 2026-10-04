import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText, getProfile, saveProfile } from "./profile";

test("normal Indonesian shop names are accepted and tidied", () => {
  assert.equal(cleanText("  Bakso   Bu Sri ", 2, 40), "Bakso Bu Sri");
  assert.equal(cleanText("Toko Berkah & Jaya (Pasar Baru)", 2, 40), "Toko Berkah & Jaya (Pasar Baru)");
  assert.equal(cleanText("Warung Pak H. Ahmad's", 2, 40), "Warung Pak H. Ahmad's");
  assert.equal(cleanText("Bu Sri", 0, 20), "Bu Sri");
});

test("links, handles, markup and symbols are rejected", () => {
  for (const bad of ["Beli di https://evil.example", "www.evil.com", "toko.com", "@bankbca_resmi", "<script>alert(1)</script>", "**tebal**", "Rp 5 juta! klik", "a"]) {
    assert.equal(cleanText(bad, 2, 40), null, JSON.stringify(bad));
  }
});

test("control characters become spaces; invisible text-direction tricks are rejected", () => {
  assert.equal(cleanText("Toko\u0000Mati", 2, 40), "Toko Mati");
  assert.equal(cleanText("Toko\nBaru", 2, 40), "Toko Baru");
  assert.equal(cleanText("Toko‮Mati", 2, 40), null, "right-to-left override can disguise text");
});

test("length limits and non-strings", () => {
  assert.equal(cleanText("x".repeat(41), 2, 40), null);
  assert.equal(cleanText("", 2, 40), null);
  assert.equal(cleanText(undefined, 2, 40), null);
  assert.equal(cleanText(123 as any, 2, 40), null);
});

test("profile is stored per address, case-insensitively", async () => {
  const a = "0xAbCdEf0123456789aBcDeF0123456789ABcdef01";
  assert.equal(await getProfile(a), null);
  await saveProfile(a, "Bakso Bu Sri", "Bu Sri");
  const p = await getProfile(a.toLowerCase());
  assert.equal(p?.name, "Bakso Bu Sri");
  assert.equal(p?.nickname, "Bu Sri");
});
