import { test } from "node:test";
import assert from "node:assert/strict";
import { customerNumber, derivedStatus, recordPayer } from "./derive";

test("an unaccepted offer becomes Expired after its TTL, other statuses never change", () => {
  const ttl = 86_400n;
  assert.equal(derivedStatus("Proposed", 1000n, ttl, 1000 + 86_400), "Proposed", "exactly at the deadline is still valid (contract uses >)");
  assert.equal(derivedStatus("Proposed", 1000n, ttl, 1000 + 86_401), "Expired");
  for (const s of ["Active", "Repaid", "Defaulted", "None"] as const) assert.equal(derivedStatus(s, 1n, ttl, 9_999_999), s);
});

test("customers are numbered in first-seen order and stay stable", () => {
  const order: string[] = [];
  const A = "0xAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", B = "0xBbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", C = "0xCccccccccccccccccccccccccccccccccccccccc";
  recordPayer(order, A); recordPayer(order, B); recordPayer(order, A); recordPayer(order, C);
  assert.deepEqual(order.length, 3, "repeat payers are not added twice");
  assert.equal(customerNumber(order, A), 1);
  assert.equal(customerNumber(order, B), 2);
  assert.equal(customerNumber(order, C), 3);
  assert.equal(customerNumber(order, A.toUpperCase().replace("0X", "0x")), 1, "case-insensitive");
});

test("unknown payer or missing list gives 0, never a wrong number", () => {
  assert.equal(customerNumber([], "0x1234567890123456789012345678901234567890"), 0);
  assert.equal(customerNumber(undefined, "0x1234567890123456789012345678901234567890"), 0);
});
