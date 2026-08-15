import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingUpdatePayload,
  createBookingActionFormValues,
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
