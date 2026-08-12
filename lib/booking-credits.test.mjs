import assert from "node:assert/strict";
import test from "node:test";
import { getBookingCreditsToUse } from "./booking-credits.ts";

test("applies no more than the available credits or per-booking maximum", () => {
  assert.equal(getBookingCreditsToUse(true, 50_000, 30_000), 30_000);
  assert.equal(getBookingCreditsToUse(true, 10_000, 30_000), 10_000);
  assert.equal(getBookingCreditsToUse(true, 1234.567, 30_000), 1234.56);
  assert.equal(getBookingCreditsToUse(false, 50_000, 30_000), 0);
});

test("rejects invalid or negative credit balances", () => {
  assert.equal(getBookingCreditsToUse(true, Number.NaN, 30_000), 0);
  assert.equal(getBookingCreditsToUse(true, -5_000, 30_000), 0);
});
