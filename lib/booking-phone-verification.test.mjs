import assert from "node:assert/strict";
import { mock, test } from "node:test";

class ApiError extends Error {
  constructor(message, { status = 422, code, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

mock.module("@/lib/api-client", {
  namedExports: {
    ApiError,
    getJson: async () => {
      throw new Error("unexpected getJson");
    },
    getJsonWithAuth: async () => {
      throw new Error("unexpected getJsonWithAuth");
    },
    postJson: async () => {
      throw new Error("unexpected postJson");
    },
    postJsonWithAuth: async () => {
      throw new Error("unexpected postJsonWithAuth");
    },
  },
});

const { isPhoneVerificationRequired } = await import(
  "../services/booking-payment.ts"
);

const phoneVerificationError = () =>
  new ApiError("Verify your phone number before creating a booking", {
    code: "BOOKING_PHONE_VERIFICATION_REQUIRED",
  });

test("recognizes the structured phone verification booking error", () => {
  assert.equal(isPhoneVerificationRequired(phoneVerificationError()), true);
  assert.equal(
    isPhoneVerificationRequired(
      new ApiError("price changed", { code: "BOOKING_PRICE_CHANGED" }),
    ),
    false,
  );
  assert.equal(
    isPhoneVerificationRequired(
      new Error("BOOKING_PHONE_VERIFICATION_REQUIRED"),
    ),
    false,
  );
});
