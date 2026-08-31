import assert from "node:assert/strict";
import test from "node:test";

import { guestBookingLookupSchema } from "./guest-booking.ts";

test("normalizes guest booking lookup values", () => {
  assert.deepEqual(
    guestBookingLookupSchema.parse({
      bookingReference: " bk-guest-001 ",
      email: " Guest@Example.com ",
    }),
    {
      bookingReference: "BK-GUEST-001",
      email: "guest@example.com",
    },
  );
});

test("uses the shipped guest lookup validation messages", () => {
  const empty = guestBookingLookupSchema.safeParse({
    bookingReference: "",
    email: "",
  });
  assert.equal(empty.success, false);
  assert.deepEqual(
    empty.error.issues.map((issue) => issue.message),
    ["Enter your booking reference.", "Enter a valid email address."],
  );

  const longReference = guestBookingLookupSchema.safeParse({
    bookingReference: "B".repeat(65),
    email: "guest@example.com",
  });
  assert.equal(longReference.success, false);
  assert.equal(
    longReference.error.issues[0]?.message,
    "Booking reference is too long.",
  );
});
