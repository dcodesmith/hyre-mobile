import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExpiredBookingSearchDestination,
  shouldReconcileAfterBrowserClose,
} from "./payment-expiry-navigation.ts";

test("builds the expired-booking search destination from supported criteria", () => {
  assert.equal(
    buildExpiredBookingSearchDestination({
      bookingType: "AIRPORT_PICKUP",
      from: "2026-08-20",
      to: "2026-08-20",
      pickupTime: "14:30",
      flightNumber: ["BA 123", "ignored"],
    }),
    "/search?bookingType=AIRPORT_PICKUP&from=2026-08-20&to=2026-08-20&pickupTime=14%3A30&flightNumber=BA+123",
  );
});

test("falls back to the unfiltered search route", () => {
  assert.equal(buildExpiredBookingSearchDestination({}), "/search");
});

test("reconciles cancelled or dismissed checkout only after expiry", () => {
  const expiresAt = "2026-08-17T10:00:00.000Z";
  const beforeExpiry = Date.parse("2026-08-17T09:59:59.999Z");
  const atExpiry = Date.parse(expiresAt);

  assert.equal(
    shouldReconcileAfterBrowserClose("cancel", expiresAt, beforeExpiry),
    false,
  );
  assert.equal(
    shouldReconcileAfterBrowserClose("cancel", expiresAt, atExpiry),
    true,
  );
  assert.equal(
    shouldReconcileAfterBrowserClose("dismiss", expiresAt, atExpiry),
    true,
  );
  assert.equal(
    shouldReconcileAfterBrowserClose("success", expiresAt, atExpiry),
    false,
  );
  assert.equal(
    shouldReconcileAfterBrowserClose("cancel", "invalid", atExpiry),
    false,
  );
});
