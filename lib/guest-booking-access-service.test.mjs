import assert from "node:assert/strict";
import { mock, test } from "node:test";

const calls = [];

class ApiError extends Error {
  constructor(message, { status }) {
    super(message);
    this.status = status;
  }
}

mock.module("@/lib/api-client", {
  namedExports: {
    ApiError,
    getJson: async (...args) => {
      calls.push({ method: "GET", args });
      return { bookingId: "booking-1" };
    },
    postJson: async (...args) => {
      calls.push({ method: "POST", args });
      return { message: "Check your email" };
    },
  },
});

const {
  fetchGuestBooking,
  getGuestBookingRequestErrorMessage,
  isInvalidGuestBookingAccessError,
  requestGuestBookingAccess,
} = await import("../services/guest-booking-access.ts");

test("requests guest access without authenticated helpers", async () => {
  calls.length = 0;
  const payload = {
    bookingReference: "BK-GUEST-001",
    email: "guest@example.com",
  };

  await requestGuestBookingAccess(payload);

  assert.deepEqual(calls, [
    {
      method: "POST",
      args: [
        "/api/bookings/guest-access",
        payload,
        { credentials: "omit" },
      ],
    },
  ]);
});

test("fetches guest detail with the token outside the query cache key", async () => {
  calls.length = 0;
  const token = "a".repeat(42) + "_";

  await fetchGuestBooking(token);

  assert.deepEqual(calls, [
    {
      method: "GET",
      args: [
        `/api/bookings/guest-access?token=${token}`,
        { credentials: "omit" },
      ],
    },
  ]);
});

test("maps guest access errors to enumeration-safe copy", () => {
  assert.equal(
    getGuestBookingRequestErrorMessage(
      new ApiError("rate limited", { status: 429 }),
    ),
    "Too many access requests. Please wait before trying again.",
  );
  assert.equal(
    getGuestBookingRequestErrorMessage(
      new ApiError("internal detail", { status: 500 }),
    ),
    "We couldn’t send an access link right now. Please try again.",
  );
  assert.equal(
    isInvalidGuestBookingAccessError(
      new ApiError("not found", { status: 404 }),
    ),
    true,
  );
});
