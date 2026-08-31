import assert from "node:assert/strict";
import test from "node:test";

import {
  guestBookingAsDetail,
  resolveBookingDetailAccess,
} from "./guest-booking.ts";

test("maps guest detail to a read-only booking without fee data", () => {
  const detail = guestBookingAsDetail({
    bookingId: "booking-1",
    bookingReference: "BK-GUEST-001",
    status: "CONFIRMED",
    paymentStatus: "PAID",
    bookingType: "DAY",
    startDate: "2026-08-31T08:00:00.000Z",
    endDate: "2026-08-31T20:00:00.000Z",
    pickupLocation: "Lagos Airport",
    returnLocation: "Victoria Island",
    specialRequests: null,
    cancellationReason: null,
    flightNumber: null,
    totalAmount: 125000,
    currency: "NGN",
    accessExpiresAt: "2026-08-31T10:15:00.000Z",
    car: {
      make: "Toyota",
      model: "Camry",
      year: 2024,
      images: ["https://example.test/car.jpg"],
    },
    chauffeur: null,
    legs: [
      {
        id: "leg-1",
        legDate: "2026-08-31T00:00:00.000Z",
        legStartTime: "2026-08-31T08:00:00.000Z",
        legEndTime: "2026-08-31T22:00:00.000Z",
        extensions: [
          {
            id: "extension-1",
            extensionStartTime: "2026-08-31T20:00:00.000Z",
            extensionEndTime: "2026-08-31T22:00:00.000Z",
            extendedDurationHours: 2,
            status: "ACTIVE",
            paymentStatus: "PAID",
          },
        ],
      },
    ],
  });

  assert.equal(detail.canEdit, false);
  assert.equal(detail.canCancel, false);
  assert.equal(detail.legs[0].canExtend, false);
  assert.equal(detail.legs[0].maxExtendableHours, 0);
  assert.equal(detail.netTotal, null);
  assert.equal(detail.flight, null);
  assert.deepEqual(detail.car.images, [
    { url: "https://example.test/car.jpg" },
  ]);
  assert.equal(detail.totalAmount, 125000);
  assert.equal(detail.legs[0].legEndTime, "2026-08-31T22:00:00.000Z");
});

test("chooses authenticated detail before guest access", () => {
  assert.equal(
    resolveBookingDetailAccess({
      isAuthHydrating: false,
      isAuthenticated: true,
      guestSessionStatus: "valid",
    }),
    "account",
  );
});

test("allows an unauthenticated user only with a valid guest session", () => {
  assert.equal(
    resolveBookingDetailAccess({
      isAuthHydrating: false,
      isAuthenticated: false,
      guestSessionStatus: "valid",
    }),
    "guest",
  );
  assert.equal(
    resolveBookingDetailAccess({
      isAuthHydrating: false,
      isAuthenticated: false,
      guestSessionStatus: "missing",
    }),
    "unauthenticated",
  );
  assert.equal(
    resolveBookingDetailAccess({
      isAuthHydrating: false,
      isAuthenticated: false,
      guestSessionStatus: "expired",
    }),
    "expired",
  );
  assert.equal(
    resolveBookingDetailAccess({
      isAuthHydrating: false,
      isAuthenticated: false,
      guestSessionStatus: "error",
    }),
    "error",
  );
});
