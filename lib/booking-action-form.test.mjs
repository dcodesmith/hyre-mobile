import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingUpdatePayload,
  createBookingActionFormValues,
  formatBookingDateTime,
  formatBookingListDateRange,
  formatBookingListTime,
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

test("formats a Lagos date range without repeating the month or year", () => {
  assert.equal(
    formatBookingListDateRange(
      "2026-08-21T08:00:00.000Z",
      "2026-08-21T20:00:00.000Z",
    ),
    "Aug 21",
  );
  assert.equal(
    formatBookingListDateRange(
      "2026-10-09T10:00:00.000Z",
      "2026-10-10T10:00:00.000Z",
    ),
    "Oct 9 - 10",
  );
  assert.equal(
    formatBookingListDateRange(
      "2026-08-31T20:00:00.000Z",
      "2026-09-01T08:00:00.000Z",
    ),
    "Aug 31 - Sep 1",
  );
  assert.equal(
    formatBookingListDateRange(
      "2026-12-31T20:00:00.000Z",
      "2027-01-01T08:00:00.000Z",
    ),
    "Dec 31, 2026 - Jan 1, 2027",
  );
});

test("returns the original start value when a booking date is invalid", () => {
  assert.equal(
    formatBookingListDateRange("not-a-date", "2026-08-21T08:00:00.000Z"),
    "not-a-date",
  );
});

test("formats the Lagos pickup time", () => {
  assert.equal(formatBookingListTime("2026-08-21T08:00:00.000Z"), "9:00 AM");
  assert.equal(formatBookingListTime("2026-08-21T23:30:00.000Z"), "12:30 AM");
  assert.equal(formatBookingListTime("not-a-date"), "not-a-date");
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
