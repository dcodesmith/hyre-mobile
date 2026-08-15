import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingUpdatePayload,
  createBookingActionFormValues,
  formatBookingDateTime,
} from "./booking-action-form.ts";

test("initializes booking action values from the booking", () => {
  assert.deepEqual(
    createBookingActionFormValues({
      type: "DAY",
      startDate: "2026-08-20T08:00:00.000Z",
      pickupLocation: "1 Lagos Road",
      returnLocation: "2 Lagos Road",
    }),
    {
      pickupTime: "9:00 AM",
      pickupAddress: "1 Lagos Road",
      sameLocation: false,
      dropOffAddress: "2 Lagos Road",
    },
  );
});

test("uses safe fallbacks for invalid booking dates", () => {
  assert.equal(formatBookingDateTime("invalid"), "Date unavailable");
  assert.equal(
    createBookingActionFormValues({
      type: "DAY",
      startDate: "invalid",
      pickupLocation: "1 Lagos Road",
      returnLocation: "1 Lagos Road",
    }).pickupTime,
    "",
  );
});

test("builds a normalized day-booking update payload", () => {
  assert.deepEqual(
    buildBookingUpdatePayload("DAY", {
      pickupTime: "10:00 AM",
      pickupAddress: "  1 Lagos Road  ",
      sameLocation: false,
      dropOffAddress: "  2 Lagos Road  ",
    }),
    {
      payload: {
        pickupTime: "10:00 AM",
        pickupAddress: "1 Lagos Road",
        sameLocation: false,
        dropOffAddress: "2 Lagos Road",
      },
    },
  );
});

test("omits pickup time for non-day bookings", () => {
  assert.deepEqual(
    buildBookingUpdatePayload("NIGHT", {
      pickupTime: "10:00 AM",
      pickupAddress: "1 Lagos Road",
      sameLocation: false,
      dropOffAddress: "2 Lagos Road",
    }),
    {
      payload: {
        pickupAddress: "1 Lagos Road",
        sameLocation: false,
        dropOffAddress: "2 Lagos Road",
      },
    },
  );
});

test("omits drop-off address when locations match", () => {
  assert.deepEqual(
    buildBookingUpdatePayload("DAY", {
      pickupTime: "10:00 AM",
      pickupAddress: "1 Lagos Road",
      sameLocation: true,
      dropOffAddress: "ignored",
    }),
    {
      payload: {
        pickupTime: "10:00 AM",
        pickupAddress: "1 Lagos Road",
        sameLocation: true,
      },
    },
  );
});

test("rejects missing required booking action addresses", () => {
  assert.deepEqual(
    buildBookingUpdatePayload("NIGHT", {
      pickupTime: "",
      pickupAddress: "",
      sameLocation: true,
      dropOffAddress: "",
    }),
    { error: "Pickup address is required." },
  );
  assert.deepEqual(
    buildBookingUpdatePayload("FULL_DAY", {
      pickupTime: "",
      pickupAddress: "1 Lagos Road",
      sameLocation: false,
      dropOffAddress: " ",
    }),
    { error: "Drop-off address is required when locations differ." },
  );
});
