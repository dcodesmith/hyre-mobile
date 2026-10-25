import assert from "node:assert/strict";
import test from "node:test";
import {
  completedPhoneVerificationContinuation,
  normalizePhoneOtpInput,
  postLoginContinuation,
  readPhoneVerificationContinuation,
  shouldAutoFinishPhoneVerification,
} from "./phone-verification-continuation.ts";

test("reads phone verification continuation params", () => {
  assert.deepEqual(
    readPhoneVerificationContinuation({
      redirectTo: ["/bookings/booking-1", "/cars/other"],
      resumePrevious: ["true", "false"],
    }),
    { redirectTo: "/bookings/booking-1", resumePrevious: true },
  );
  assert.deepEqual(
    readPhoneVerificationContinuation({
      redirectTo: "",
      resumePrevious: "false",
    }),
    { redirectTo: undefined, resumePrevious: false },
  );
  assert.deepEqual(readPhoneVerificationContinuation({}), {
    redirectTo: undefined,
    resumePrevious: false,
  });
});

test("does not auto-finish booking checkout recovery from stale verified state", () => {
  assert.equal(
    shouldAutoFinishPhoneVerification({
      phoneVerified: true,
      reason: ["booking"],
    }),
    false,
  );
  assert.equal(
    shouldAutoFinishPhoneVerification({
      phoneVerified: true,
      reason: undefined,
    }),
    true,
  );
  assert.equal(
    shouldAutoFinishPhoneVerification({
      phoneVerified: false,
      reason: "booking",
    }),
    false,
  );
});

test("continues only to a safe in-app destination", () => {
  assert.deepEqual(
    postLoginContinuation({
      resumePrevious: false,
      redirectTo: "/bookings/booking-1",
    }),
    { method: "replace", href: "/bookings/booking-1" },
  );
  assert.deepEqual(
    postLoginContinuation({
      resumePrevious: false,
      redirectTo: "https://evil.example/phish",
    }),
    { method: "replace", href: "/" },
  );
  assert.equal(
    postLoginContinuation({
      resumePrevious: false,
      redirectTo: "//evil.example",
    })?.href,
    "/",
  );
  assert.deepEqual(
    postLoginContinuation({
      resumePrevious: false,
      redirectTo: "/bookings/booking-1",
    }),
    { method: "replace", href: "/bookings/booking-1" },
  );
  assert.equal(
    postLoginContinuation({
      resumePrevious: true,
      redirectTo: "/bookings/booking-1",
    }),
    null,
  );

  assert.deepEqual(
    completedPhoneVerificationContinuation({
      resumePrevious: true,
      canGoBack: true,
      redirectTo: "https://evil.example",
    }),
    { method: "back" },
  );
  assert.deepEqual(
    completedPhoneVerificationContinuation({
      resumePrevious: true,
      canGoBack: false,
      redirectTo: "/cars/car-1?bookingType=DAY",
    }),
    { method: "replace", href: "/cars/car-1?bookingType=DAY" },
  );
  assert.deepEqual(
    completedPhoneVerificationContinuation({
      resumePrevious: false,
      canGoBack: true,
      redirectTo: "/cars/../bookings/1",
    }),
    { method: "replace", href: "/" },
  );
});

test("keeps only digits within the phone code length", () => {
  assert.equal(normalizePhoneOtpInput("12a34 567890123"), "1234567890");
  assert.equal(normalizePhoneOtpInput("12a34", 4), "1234");
});
