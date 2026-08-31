import assert from "node:assert/strict";
import test from "node:test";
import { createBookingPaymentSummary } from "./booking-payment-summary.ts";

test("adds only confirmed extensions to the booking payment summary", () => {
  const summary = createBookingPaymentSummary({
    netTotal: 100_000,
    totalAmount: 115_025,
    platformCustomerServiceFeeAmount: 7_000,
    platformCustomerServiceFeeRatePercent: 7,
    vatAmount: 8_025,
    vatRatePercent: 7.5,
    securityDetailCost: 0,
    fuelUpgradeCost: 0,
    referralDiscountAmount: 0,
    referralCreditsUsed: 0,
    legs: [
      {
        extensions: [
          {
            status: "ACTIVE",
            paymentStatus: "PAID",
            extendedDurationHours: 2,
            netTotal: 20_000,
          },
          {
            status: "PENDING",
            paymentStatus: "UNPAID",
            extendedDurationHours: 1,
            netTotal: 10_000,
          },
        ],
      },
    ],
  });

  assert.equal(summary.extensionNetTotal, 20_000);
  assert.equal(summary.extendedHours, 2);
  assert.equal(summary.platformFee, 8_400);
  assert.equal(summary.vatAmount, 9_630);
  assert.equal(summary.totalAmount, 138_030);
});
