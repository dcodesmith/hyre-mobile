import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingPricingPreviewRequest,
  mergeBookingPricingPreview,
  resolveBookingPricingState,
} from "./car-detail-pricing.ts";

test("resolves incomplete, loading, error, and ready pricing states", () => {
  const state = (overrides) =>
    resolveBookingPricingState({
      requested: true,
      hasPreview: false,
      isFetching: false,
      isError: false,
      isPaused: false,
      ...overrides,
    });

  assert.equal(state({ requested: false }), "incomplete");
  assert.equal(state({ isFetching: true }), "loading");
  assert.equal(state({ isError: true }), "error");
  assert.equal(state({ hasPreview: true, isPaused: true }), "error");
  assert.equal(state({}), "error");
  assert.equal(state({ hasPreview: true }), "ready");
});

test("builds preview requests with booking-type policies", () => {
  const request = buildBookingPricingPreviewRequest({
    carId: "car-1",
    bookingType: "NIGHT",
    from: new Date(2026, 7, 20),
    to: new Date(2026, 7, 20),
    pickupTime: undefined,
    requiresFullTank: true,
    useCredits: 500,
  });

  assert.equal(request?.pickupTime, "11 PM");
  assert.equal(request?.requiresFullTank, false);
  assert.equal(request?.useCredits, 500);
  assert.equal(
    buildBookingPricingPreviewRequest({
      carId: "car-1",
      bookingType: "DAY",
      from: undefined,
      to: undefined,
      pickupTime: "9:00 AM",
      requiresFullTank: false,
      useCredits: 0,
    }),
    null,
  );
});

test("merges authoritative preview amounts into client pricing", () => {
  const pricing = {
    baseRate: 100,
    totalDays: 1,
    baseTotal: 100,
    platformFee: 5,
    platformFeeRate: 5,
    vat: 7.5,
    vatRate: 7.5,
    fuelUpgradeCost: 0,
    finalTotal: 112.5,
    fuelNote: null,
  };
  const preview = {
    currency: "NGN",
    numberOfLegs: 1,
    discountCoverage: "FULL",
    segments: [
      {
        kind: "PROMO",
        units: 1,
        unitPrice: 80,
        total: 80,
        compareAtUnitPrice: 100,
        label: null,
        promotion: null,
      },
    ],
    baseTotal: 80,
    compareAtBaseTotal: 100,
    securityDetailCost: 0,
    fuelUpgradeCost: 10,
    platformFeeRatePercent: 5,
    platformFeeAmount: 4,
    compareAtPlatformFeeAmount: 5,
    subtotalBeforeDiscounts: 94,
    compareAtSubtotalBeforeDiscounts: 115,
    referralDiscountAmount: 0,
    creditsUsed: 20,
    subtotalAfterDiscounts: 74,
    vatRatePercent: 7.5,
    vatAmount: 6,
    compareAtVatAmount: 7.5,
    totalAmount: 80,
    compareAtTotalAmount: 122.5,
    savingsAmount: 42.5,
  };

  const result = mergeBookingPricingPreview(pricing, preview, "DAY", {
    dayRate: 100,
    nightRate: null,
    fullDayRate: null,
    airportPickupRate: null,
  });

  assert.equal(result.baseRate, 80);
  assert.equal(result.originalBaseRate, 100);
  assert.equal(result.finalTotal, 80);
  assert.equal(result.creditsUsed, 20);
  assert.equal(result.originalGrandTotal, 122.5);
  assert.equal(result.savingsAmount, 42.5);
});
