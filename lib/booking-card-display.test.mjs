import assert from "node:assert/strict";
import { test } from "node:test";

const {
  getBookingIdentityVisibility,
  getBookingRentalCopy,
} = await import("./booking-card-display.ts");

test("shows guest identity and phone verification before and after OTP", () => {
  assert.deepEqual(
    getBookingIdentityVisibility({
      isAuthenticated: false,
      phoneVerified: false,
    }),
    {
      showGuestDetails: true,
      showPhoneVerification: true,
    },
  );
  assert.deepEqual(
    getBookingIdentityVisibility({
      isAuthenticated: false,
      phoneVerified: true,
    }),
    {
      showGuestDetails: true,
      showPhoneVerification: true,
    },
  );
});

test("only shows phone verification to signed-in users who need it", () => {
  assert.deepEqual(
    getBookingIdentityVisibility({
      isAuthenticated: true,
      phoneVerified: false,
    }),
    {
      showGuestDetails: false,
      showPhoneVerification: true,
    },
  );
  assert.deepEqual(
    getBookingIdentityVisibility({
      isAuthenticated: true,
      phoneVerified: true,
    }),
    {
      showGuestDetails: false,
      showPhoneVerification: false,
    },
  );
});

test("formats every booking type for the cost breakdown", () => {
  assert.deepEqual(getBookingRentalCopy("DAY", 2), {
    title: "Same day",
    detail: "(12 hours) x 2",
  });
  assert.deepEqual(getBookingRentalCopy("NIGHT", 1), {
    title: "Night",
    detail: "(6 hours) x 1",
  });
  assert.deepEqual(getBookingRentalCopy("FULL_DAY", 3), {
    title: "Full day",
    detail: "(24 hours) x 3",
  });
  assert.deepEqual(getBookingRentalCopy("AIRPORT_PICKUP", 1), {
    title: "Airport pickup",
    detail: null,
  });
});
