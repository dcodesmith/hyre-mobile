import assert from "node:assert/strict";
import test from "node:test";
import { formatRateAmount } from "./currency.ts";

test("formatRateAmount omits decimals for whole rates", () => {
  assert.equal(formatRateAmount(120000), "₦120,000");
  assert.equal(formatRateAmount(80000), "₦80,000");
  assert.equal(formatRateAmount(0), "₦0");
});

test("formatRateAmount keeps two decimals for fractional rates", () => {
  assert.equal(formatRateAmount(9509.5), "₦9,509.50");
  assert.equal(formatRateAmount(9509.567), "₦9,509.57");
});
