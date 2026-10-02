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

const { PHONE_VERIFICATION_PATHNAME } = await import(
  "./phone-verification-continuation.ts"
);
const { bookingCheckoutPhoneVerificationRoute } = await import(
  "../services/booking-payment.ts"
);

const phoneVerificationError = () =>
  new ApiError("Verify your phone number before creating a booking", {
    code: "BOOKING_PHONE_VERIFICATION_REQUIRED",
  });

test("recovers authenticated checkout when phone verification is required", () => {
  assert.deepEqual(
    bookingCheckoutPhoneVerificationRoute(phoneVerificationError(), true),
    {
      pathname: PHONE_VERIFICATION_PATHNAME,
      params: { resumePrevious: "true" },
    },
  );
  assert.equal(
    bookingCheckoutPhoneVerificationRoute(phoneVerificationError(), false),
    null,
  );
  assert.equal(
    bookingCheckoutPhoneVerificationRoute(
      new ApiError("price changed", { code: "BOOKING_PRICE_CHANGED" }),
      true,
    ),
    null,
  );
  assert.equal(
    bookingCheckoutPhoneVerificationRoute(
      new Error("BOOKING_PHONE_VERIFICATION_REQUIRED"),
      true,
    ),
    null,
  );
});
