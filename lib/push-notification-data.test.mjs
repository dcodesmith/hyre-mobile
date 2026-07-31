import assert from "node:assert/strict";
import test from "node:test";
import {
  getPushNotificationRoute,
  parsePushNotificationData,
} from "./push-notification-data.ts";

test("parses a typed booking destination", () => {
  assert.deepEqual(
    parsePushNotificationData({
      type: "booking-updated",
      target: { kind: "booking", bookingId: "booking-1" },
    }),
    {
      type: "booking-updated",
      target: { kind: "booking", bookingId: "booking-1" },
    },
  );
});

test("routes a typed booking destination to booking details", () => {
  assert.deepEqual(
    getPushNotificationRoute({
      type: "booking-updated",
      target: { kind: "booking", bookingId: "booking-1" },
    }),
    {
      pathname: "/bookings/[id]",
      params: { id: "booking-1" },
    },
  );
});

test("parses and routes a typed referrals destination", () => {
  const data = {
    type: "referral-reward-released",
    target: { kind: "referrals" },
  };

  assert.deepEqual(parsePushNotificationData(data), data);
  assert.deepEqual(getPushNotificationRoute(data), {
    pathname: "/(tabs)/referrals",
  });
});

test("rejects flat, malformed, or unsupported destinations", () => {
  assert.equal(
    parsePushNotificationData({
      type: "booking-extension-confirmed",
      bookingId: "booking-2",
    }),
    null,
  );
  assert.equal(
    parsePushNotificationData({
      type: "payout-received",
      target: { kind: "payout", payoutId: "payout-1" },
    }),
    null,
  );
  assert.equal(
    parsePushNotificationData({
      type: "booking-updated",
      target: { kind: "booking", bookingId: "" },
    }),
    null,
  );
  assert.equal(
    parsePushNotificationData({
      type: "referral-reward-released",
      target: { kind: "referrals", bookingId: "booking-2" },
    }),
    null,
  );
  assert.equal(
    parsePushNotificationData({
      type: "unknown-notification",
      target: { kind: "referrals" },
    }),
    null,
  );
  assert.equal(
    parsePushNotificationData({
      type: "booking-updated",
      target: { kind: "booking", bookingId: "booking-2" },
      unexpected: true,
    }),
    null,
  );
});
