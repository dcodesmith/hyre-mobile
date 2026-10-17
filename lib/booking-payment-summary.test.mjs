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
    addons: [],
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

  assert.equal(summary.breakdownAvailable, true);
  assert.equal(summary.extensionNetTotal, 20_000);
  assert.equal(summary.extendedHours, 2);
  assert.equal(summary.platformFee, 8_400);
  assert.equal(summary.vatAmount, 9_630);
  assert.equal(summary.totalAmount, 138_030);
  assert.deepEqual(summary.addons, []);
});

test("includes snapshot add-ons when reconstructing an extended total", () => {
  const addons = [
    {
      code: "SECURITY_DETAIL",
      name: "Security Detail",
      pricingUnit: "PER_BOOKING",
      unitPrice: 5_000,
      quantity: 1,
      totalPrice: 5_000,
    },
  ];
  const summary = createBookingPaymentSummary({
    netTotal: 100_000,
    totalAmount: 120_025,
    platformCustomerServiceFeeAmount: 7_000,
    platformCustomerServiceFeeRatePercent: 7,
    vatAmount: 8_025,
    vatRatePercent: 7.5,
    addons,
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
        ],
      },
    ],
  });

  assert.equal(summary.totalAmount, 143_030);
  assert.deepEqual(summary.addons, addons);
});

test("keeps the charged total when the fee breakdown was not loaded", () => {
  const summary = createBookingPaymentSummary({
    netTotal: null,
    totalAmount: 50_000,
    platformCustomerServiceFeeAmount: null,
    platformCustomerServiceFeeRatePercent: null,
    vatAmount: null,
    vatRatePercent: null,
    addons: [],
    fuelUpgradeCost: null,
    referralDiscountAmount: null,
    referralCreditsUsed: null,
    legs: [
      {
        extensions: [
          {
            status: "ACTIVE",
            paymentStatus: "PAID",
            extendedDurationHours: 2,
            netTotal: 20_000,
          },
        ],
      },
    ],
  });

  assert.equal(summary.breakdownAvailable, false);
  assert.equal(summary.totalAmount, 50_000);
  assert.equal(summary.netTotal, 0);
  assert.equal(summary.extendedHours, 2);
});
