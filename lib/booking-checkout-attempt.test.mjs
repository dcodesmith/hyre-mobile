import assert from "node:assert/strict";
import test from "node:test";
import { getBookingCheckoutAttempt } from "./booking-checkout-attempt.ts";

const payload = {
  carId: "car-1",
  startDate: "2026-08-10T08:00:00.000Z",
  endDate: "2026-08-10T20:00:00.000Z",
  expectedTotalAmount: "125000.00",
};
const createIdempotencyKey = () => "123e4567-e89b-42d3-a456-426614174000";

test("reuses an idempotency key for the same checkout payload", () => {
  const first = getBookingCheckoutAttempt(null, payload, createIdempotencyKey);
  const retry = getBookingCheckoutAttempt(
    first,
    { ...payload },
    createIdempotencyKey,
  );

  assert.equal(retry, first);
  assert.match(first.idempotencyKey, /^[A-Za-z0-9._~:-]{8,128}$/);
});

test("creates a new idempotency key when the checkout payload changes", () => {
  const first = getBookingCheckoutAttempt(null, payload, createIdempotencyKey);
  const changed = getBookingCheckoutAttempt(
    first,
    {
      ...payload,
      expectedTotalAmount: "130000.00",
    },
    () => "123e4567-e89b-42d3-a456-426614174001",
  );

  assert.notEqual(changed.idempotencyKey, first.idempotencyKey);
});

test("creates a new idempotency key when applied credits change", () => {
  const first = getBookingCheckoutAttempt(null, payload, createIdempotencyKey);
  const changed = getBookingCheckoutAttempt(
    first,
    { ...payload, useCredits: 10_000 },
    () => "123e4567-e89b-42d3-a456-426614174001",
  );

  assert.notEqual(changed.idempotencyKey, first.idempotencyKey);
});
