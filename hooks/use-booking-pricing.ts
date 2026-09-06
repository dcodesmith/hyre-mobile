import type { BookingType } from "@/lib/booking-types";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
} from "@/lib/booking-types";
import { getFuelTankNote } from "@/lib/booking-utils";
import { getListRateForBookingType } from "@/lib/car-detail-pricing";
import type { CostBreakdownData } from "@/lib/car-detail-types";
import type { CarPromotion } from "@/lib/car-types";
import {
  applyPromotionDiscount,
  hasActivePromotion,
} from "@/lib/promotion-utils";
import { useMemo } from "react";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

interface UseBookingPricingParams {
  dayRate: number;
  nightRate?: number | null;
  fullDayRate?: number | null;
  airportPickupRate?: number | null;
  bookingType: BookingType;
  totalDays: number;
  platformFeeRate?: number;
  vatRate?: number;
  requiresFullTank?: boolean;
  fullTankUpgradeFee?: number;
  pricingIncludesFuel?: boolean;
  /** When set, list `baseRate` for the selected booking type is discounted like the worker. */
  promotion?: CarPromotion | null;
}

/**
 * Base booking pricing — fuel upgrade rules match hireApp `useBookingPricing`.
 */
export function useBookingPricing({
  dayRate,
  nightRate,
  fullDayRate,
  airportPickupRate,
  bookingType,
  totalDays,
  platformFeeRate = 0,
  vatRate = 0,
  requiresFullTank = false,
  fullTankUpgradeFee = 0,
  pricingIncludesFuel = false,
  promotion = null,
}: UseBookingPricingParams): CostBreakdownData {
  return useMemo(() => {
    let baseRate = getListRateForBookingType(bookingType, {
      dayRate,
      nightRate,
      fullDayRate,
      airportPickupRate,
    });

    const originalBaseRate = baseRate;

    if (hasActivePromotion(promotion)) {
      baseRate = applyPromotionDiscount(baseRate, promotion.discountValue);
    }

    const fuelUpgradeCost = (() => {
      if (pricingIncludesFuel) {
        return 0;
      }

      if (totalDays <= 0) {
        return 0;
      }

      if (
        bookingType === FULL_DAY_BOOKING_TYPE ||
        bookingType === NIGHT_BOOKING_TYPE ||
        bookingType === AIRPORT_PICKUP_BOOKING_TYPE ||
        !requiresFullTank ||
        totalDays >= 3
      ) {
        return 0;
      }

      return Number(fullTankUpgradeFee);
    })();

    const baseTotal = roundMoney(baseRate * Math.max(totalDays, 0));
    const platformFee = roundMoney((baseTotal * platformFeeRate) / 100);
    const subtotalBeforeVat = roundMoney(
      baseTotal + platformFee + fuelUpgradeCost,
    );

    /**
     * VAT rule (per product requirement):
     * - when promo is active, compute VAT from the discounted rental price
     * - otherwise compute VAT from the original rental price
     *
     * In both cases, VAT is based on rental price only (not service/fuel add-ons).
     */
    const vat = roundMoney((baseTotal * vatRate) / 100);
    const finalTotal = roundMoney(subtotalBeforeVat + vat);

    let originalGrandTotal: number | undefined;
    let savingsAmount: number | undefined;

    if (hasActivePromotion(promotion)) {
      const origBaseTotal = roundMoney(
        originalBaseRate * Math.max(totalDays, 0),
      );

      const origPlatformFee = roundMoney(
        (origBaseTotal * platformFeeRate) / 100,
      );

      const origSubtotalBeforeVat = roundMoney(
        origBaseTotal + origPlatformFee + fuelUpgradeCost,
      );

      const origVat = roundMoney((origBaseTotal * vatRate) / 100);

      originalGrandTotal = roundMoney(origSubtotalBeforeVat + origVat);
      savingsAmount = roundMoney(Math.max(0, originalGrandTotal - finalTotal));
    }

    const fuelNote = getFuelTankNote(
      totalDays,
      requiresFullTank,
      bookingType,
      pricingIncludesFuel,
    );

    return {
      baseRate,
      originalBaseRate: hasActivePromotion(promotion)
        ? originalBaseRate
        : undefined,
      totalDays,
      baseTotal,
      platformFee,
      platformFeeRate,
      vat,
      vatRate,
      fuelUpgradeCost,
      finalTotal,
      originalGrandTotal,
      savingsAmount,
      fuelNote,
    };
  }, [
    dayRate,
    nightRate,
    fullDayRate,
    airportPickupRate,
    bookingType,
    totalDays,
    platformFeeRate,
    vatRate,
    requiresFullTank,
    fullTankUpgradeFee,
    pricingIncludesFuel,
    promotion,
  ]);
}

/** @deprecated Prefer BOOKING_TYPE_LABELS from booking-types for web parity. */
export function getRateLabel(bookingType: BookingType): string {
  switch (bookingType) {
    case NIGHT_BOOKING_TYPE:
      return "/ night";
    case FULL_DAY_BOOKING_TYPE:
      return "/ full day";
    case AIRPORT_PICKUP_BOOKING_TYPE:
      return "/ trip";
    default:
      return "/ day";
  }
}

export function getUnitLabel(bookingType: BookingType): {
  singular: string;
  plural: string;
} {
  switch (bookingType) {
    case NIGHT_BOOKING_TYPE:
      return { singular: "night", plural: "nights" };
    case FULL_DAY_BOOKING_TYPE:
      return { singular: "full day", plural: "full days" };
    case AIRPORT_PICKUP_BOOKING_TYPE:
      return { singular: "trip", plural: "trips" };
    default:
      return { singular: "day", plural: "days" };
  }
}
