import assert from "node:assert/strict";
import test from "node:test";
import {
  getApiEndpointGroup,
  getTelemetryErrorDetails,
  stripUrlDetails,
} from "./telemetry-policy.ts";

test("reports unexpected API failures but ignores expected client responses", () => {
  const apiError = (status) => ({ name: "ApiError", status });
  assert.equal(getTelemetryErrorDetails(apiError(0)).shouldReport, true);
  assert.equal(getTelemetryErrorDetails(apiError(408)).shouldReport, true);
  assert.equal(getTelemetryErrorDetails(apiError(500)).shouldReport, true);
  assert.equal(getTelemetryErrorDetails(apiError(400)).shouldReport, false);
  assert.equal(getTelemetryErrorDetails(apiError(401)).shouldReport, false);
});

test("ignores aborts and reports unexpected thrown values", () => {
  const abort = new Error("cancelled");
  abort.name = "AbortError";

  assert.equal(getTelemetryErrorDetails(abort).shouldReport, false);
  assert.equal(getTelemetryErrorDetails(new Error("boom")).shouldReport, true);
  assert.equal(getTelemetryErrorDetails({ status: 400 }).shouldReport, true);
  assert.equal(getTelemetryErrorDetails("boom").shouldReport, true);
});

test("groups API paths without query parameters or resource identifiers", () => {
  assert.equal(
    getApiEndpointGroup(
      "/api/bookings/payment-status?txRef=secret&bookingId=secret",
    ),
    "/api/bookings/payment-status",
  );
  assert.equal(
    getApiEndpointGroup("/api/bookings/pricing-preview"),
    "/api/bookings/pricing-preview",
  );
  assert.equal(
    getApiEndpointGroup("/api/payments/booking-confirmation"),
    "/api/payments/booking-confirmation",
  );
  assert.equal(getApiEndpointGroup("/api/bookings/private-id"), "/api/bookings");
  assert.equal(getApiEndpointGroup("/auth/session"), "/auth/session");
  assert.equal(getApiEndpointGroup(""), "/");
});

test("strips query parameters and fragments from telemetry URLs", () => {
  assert.equal(
    stripUrlDetails(
      "/payment-status?tx_ref=secret&bookingId=secret#transaction",
    ),
    "/payment-status",
  );
  assert.equal(
    stripUrlDetails("https://example.com/api/bookings?token=secret"),
    "https://example.com/api/bookings",
  );
});
