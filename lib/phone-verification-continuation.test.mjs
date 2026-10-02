import assert from "node:assert/strict";
import test from "node:test";
import {
  PHONE_VERIFICATION_PATHNAME,
  completedPhoneVerificationContinuation,
  normalizePhoneOtpInput,
  phoneVerificationRouteDecision,
  postLoginContinuation,
  readPhoneVerificationContinuation,
  shouldRequirePhoneVerification,
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

test("routes unverified sessions to phone verification once", () => {
  assert.equal(
    shouldRequirePhoneVerification({
      isHydrating: false,
      hasAuthToken: true,
      phoneVerified: false,
    }),
    true,
  );
  assert.equal(
    shouldRequirePhoneVerification({
      isHydrating: true,
      hasAuthToken: true,
      phoneVerified: false,
    }),
    false,
  );
  assert.equal(
    shouldRequirePhoneVerification({
      isHydrating: false,
      hasAuthToken: false,
      phoneVerified: false,
    }),
    false,
  );
  assert.equal(
    shouldRequirePhoneVerification({
      isHydrating: false,
      hasAuthToken: true,
      phoneVerified: true,
    }),
    false,
  );
  assert.equal(
    shouldRequirePhoneVerification({
      isHydrating: false,
      hasAuthToken: true,
      phoneVerified: undefined,
    }),
    false,
  );

  assert.deepEqual(
    phoneVerificationRouteDecision({
      pathname: "/cars/car-1",
      isAlreadyRouting: false,
      continuation: {
        redirectTo: "/bookings/booking-1",
        resumePrevious: false,
      },
    }),
    {
      method: "replace",
      pathname: PHONE_VERIFICATION_PATHNAME,
      params: { redirectTo: "/bookings/booking-1" },
    },
  );
  assert.deepEqual(
    phoneVerificationRouteDecision({
      pathname: "/cars/car-1",
      isAlreadyRouting: false,
      continuation: { resumePrevious: true },
    }),
    {
      method: "push",
      pathname: PHONE_VERIFICATION_PATHNAME,
      params: { resumePrevious: "true" },
    },
  );
  assert.equal(
    phoneVerificationRouteDecision({
      pathname: PHONE_VERIFICATION_PATHNAME,
      isAlreadyRouting: false,
      continuation: { resumePrevious: true },
    }),
    null,
  );
  assert.equal(
    phoneVerificationRouteDecision({
      pathname: "/cars/car-1",
      isAlreadyRouting: true,
      continuation: { resumePrevious: true },
    }),
    null,
  );
});

test("continues only to a safe in-app destination", () => {
  assert.deepEqual(
    postLoginContinuation({
      phoneVerified: true,
      resumePrevious: false,
      redirectTo: "/bookings/booking-1",
    }),
    { method: "replace", href: "/bookings/booking-1" },
  );
  assert.deepEqual(
    postLoginContinuation({
      phoneVerified: true,
      resumePrevious: false,
      redirectTo: "https://evil.example/phish",
    }),
    { method: "replace", href: "/" },
  );
  assert.equal(
    postLoginContinuation({
      phoneVerified: true,
      resumePrevious: false,
      redirectTo: "//evil.example",
    })?.href,
    "/",
  );
  assert.equal(
    postLoginContinuation({
      phoneVerified: false,
      resumePrevious: false,
      redirectTo: "/bookings/booking-1",
    }),
    null,
  );
  assert.equal(
    postLoginContinuation({
      phoneVerified: true,
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
