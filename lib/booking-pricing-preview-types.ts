import type { BookingPricingAddon } from "./booking-addons";

export type PricingPreviewDiscountCoverage = "NONE" | "PARTIAL" | "FULL";

export type PricingPreviewSegmentKind = "PROMO" | "STANDARD";

export interface PricingPreviewPromotion {
  readonly id: string;
  readonly name: string | null;
  readonly discountValue: number;
  readonly startDate?: string;
  readonly endDateExclusive?: string;
}

export interface PricingPreviewSegment {
  readonly kind: PricingPreviewSegmentKind;
  readonly units: number;
  readonly unitPrice: number;
  readonly total: number;
  readonly compareAtUnitPrice: number | null;
  readonly label: string | null;
  readonly promotion: PricingPreviewPromotion | null;
}

export interface BookingPricingPreviewResponse {
  readonly currency: "NGN";
  readonly numberOfLegs: number;
  readonly discountCoverage: PricingPreviewDiscountCoverage;
  readonly segments: PricingPreviewSegment[];
  readonly baseTotal: number;
  readonly compareAtBaseTotal: number;
  readonly addons: BookingPricingAddon[];
  readonly addonTotal: number;
  readonly fuelUpgradeCost: number;
  readonly platformFeeRatePercent: number;
  readonly platformFeeAmount: number;
  readonly compareAtPlatformFeeAmount: number;
  readonly subtotalBeforeDiscounts: number;
  readonly compareAtSubtotalBeforeDiscounts: number;
  readonly referralDiscountAmount: number;
  readonly creditsUsed: number;
  readonly creditsApplicable?: number;
  readonly subtotalAfterDiscounts: number;
  readonly vatRatePercent: number;
  readonly vatAmount: number;
  readonly compareAtVatAmount: number;
  readonly totalAmount: number;
  readonly compareAtTotalAmount: number;
  readonly savingsAmount: number;
}

export interface BookingPricingPreviewRequest {
  readonly carId: string;
  readonly bookingType: "DAY" | "NIGHT" | "FULL_DAY" | "AIRPORT_PICKUP";
  readonly startDate: string;
  readonly endDate: string;
  readonly pickupTime: string;
  readonly addonIds: readonly string[];
  readonly requiresFullTank: boolean;
  readonly useCredits: number;
}
