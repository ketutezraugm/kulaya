import { test } from "node:test";
import assert from "node:assert/strict";
import { plainText } from "./format";

test("bold, italic and code markers are removed but the words stay", () => {
  assert.equal(plainText("Status pinjaman Anda: **Active**"), "Status pinjaman Anda: Active");
  assert.equal(plainText("Ini __penting__ dan ini *miring* dan `kode`."), "Ini penting dan ini miring dan kode.");
  assert.equal(plainText("***sangat*** penting"), "sangat penting");
  assert.equal(plainText("~~salah~~ benar"), "salah benar");
});

test("lists and headings become plain text; line breaks are kept", () => {
  assert.equal(plainText("# Ringkasan\n* Modal: Rp 500.000\n- Biaya: 4%\n+ Total: Rp 520.000"), "Ringkasan\n• Modal: Rp 500.000\n• Biaya: 4%\n• Total: Rp 520.000");
  assert.equal(plainText("**Modal:** Rp 500.000\n**Biaya:** 4%"), "Modal: Rp 500.000\nBiaya: 4%");
});

test("links keep their URL, and plain URLs with underscores or stars are not mangled", () => {
  assert.equal(plainText("Buka [halaman ini](https://kulaya.vercel.app/loan/3)"), "Buka halaman ini (https://kulaya.vercel.app/loan/3)");
  assert.equal(plainText("https://kulaya.vercel.app/pay/0xAbC_def?amount=50000"), "https://kulaya.vercel.app/pay/0xAbC_def?amount=50000");
  assert.equal(plainText("snake_case_word dan 2 * 3 = 6"), "snake_case_word dan 2 * 3 = 6");
});

test("numbers, rupiah and percentages pass through untouched (the figure guard depends on them)", () => {
  const t = "Pokok Rp 500.000, biaya 4 %, total Rp 520.000, 10% tiap penjualan.";
  assert.equal(plainText(t), t);
});

test("fenced code blocks lose the fences, excess blank lines collapse", () => {
  assert.equal(plainText("```\nhalo\n```"), "halo");
  assert.equal(plainText("a\n\n\n\nb"), "a\n\nb");
});

test("already-plain text is unchanged", () => {
  const t = "Halo! Penjualan Anda hari ini sebesar Rp 8.990.000.";
  assert.equal(plainText(t), t);
});
