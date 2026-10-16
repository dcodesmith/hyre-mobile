import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingSignInRedirectPath,
  buildCarSignInRedirectPath,
  pickRedirectToParam,
  resolvePostLoginHref,
} from "./sign-in-redirect.ts";

test("buildCarSignInRedirectPath encodes the car destination as one query value", () => {
  const path = buildCarSignInRedirectPath("car-1", {
    searchId: "01994a1d-4263-7000-8000-000000000010",
    bookingType: "DAY",
    fromDate: new Date(2026, 7, 10),
    toDate: new Date(2026, 7, 10),
    pickupTime: "9:00 AM",
    pickupAddress: "VI Lagos",
    sameLocation: true,
  });

  assert.match(path, /^\/\(tabs\)\/login\?redirectTo=/);
  // Nested car query must be encoded — not a second bare `?` on the login URL.
  assert.equal(path.includes("?bookingType="), false);

  const encoded = path.slice("/(tabs)/login?redirectTo=".length);
  const destination = decodeURIComponent(encoded);
  assert.equal(destination.startsWith("/cars/car-1?"), true);
  assert.match(destination, /bookingType=DAY/);
  assert.match(destination, /searchId=01994a1d-4263-7000-8000-000000000010/);
  assert.match(destination, /pickupTime=9%3A00\+AM/);
});

test("resolvePostLoginHref restores encoded car destinations and rejects others", () => {
  const destination = "/cars/car-1?bookingType=DAY&from=2026-08-10";
  assert.equal(
    resolvePostLoginHref(encodeURIComponent(destination)),
    destination,
  );
  assert.equal(resolvePostLoginHref(destination), destination);
  assert.equal(resolvePostLoginHref("https://evil.example/phish"), "/");
  assert.equal(resolvePostLoginHref("//evil.example"), "/");
  assert.equal(resolvePostLoginHref("evil/cars/car-1"), "/");
  assert.equal(resolvePostLoginHref("cars/car-1"), "/");
  assert.equal(resolvePostLoginHref("/bookings/booking-1"), "/bookings/booking-1");
  assert.equal(resolvePostLoginHref("/cars/../bookings/1"), "/");
  assert.equal(resolvePostLoginHref("/cars/%2e%2e/bookings/1"), "/");
  assert.equal(resolvePostLoginHref("/cars/%2Fbookings"), "/");
  assert.equal(resolvePostLoginHref("/cars/car-1/extra"), "/");
  assert.equal(resolvePostLoginHref("/bookings/booking-1/extra"), "/");
  assert.equal(resolvePostLoginHref(undefined), "/");
});

test("buildBookingSignInRedirectPath returns to the booking after login", () => {
  const path = buildBookingSignInRedirectPath("booking-1");
  const encoded = path.slice("/(tabs)/login?redirectTo=".length);

  assert.equal(decodeURIComponent(encoded), "/bookings/booking-1");
  assert.equal(resolvePostLoginHref(encoded), "/bookings/booking-1");
});

test("resolvePostLoginHref preserves URLs inside booking query values", () => {
  const pickupAddress = "https://maps.example/pickup?a=1&b=2";
  const path = buildCarSignInRedirectPath("car-1", {
    bookingType: "DAY",
    pickupAddress,
    sameLocation: true,
  });
  const encoded = path.slice("/(tabs)/login?redirectTo=".length);
  const destination = decodeURIComponent(encoded);

  assert.equal(resolvePostLoginHref(encoded), destination);
  assert.equal(resolvePostLoginHref(destination), destination);
  assert.equal(
    new URLSearchParams(destination.split("?")[1]).get("pickupAddress"),
    pickupAddress,
  );
});

test("pickRedirectToParam reads the first non-empty search param", () => {
  assert.equal(pickRedirectToParam("/cars/car-1"), "/cars/car-1");
  assert.equal(pickRedirectToParam(["/cars/car-1", "/cars/other"]), "/cars/car-1");
  assert.equal(pickRedirectToParam([""]), undefined);
  assert.equal(pickRedirectToParam(undefined), undefined);
});
