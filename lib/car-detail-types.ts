import type { SearchCar } from "./car-types";

/** Extended car type for detail page */
export interface CarDetail extends SearchCar {
  // Additional fields that might come from detail endpoint
  features?: string[];
  transmission?: string;
  description?: string;
  fuelUpgradeRate?: number | null;
}

/** Response shape for GET /api/cars/:id - returns car directly */
export type CarDetailResponse = CarDetail;

/** Platform rates from API */
export interface PlatformRates {
  vatRatePercent: number;
  platformServiceFeeRatePercent: number;
  securityDetailRate?: number;
}

/** Response shape for GET /api/rates */
export interface RatesResponse {
  vatRatePercent?: number;
  platformCustomerServiceFeeRatePercent?: number;
  securityDetailRate: number;
}

/** Booking form data for guest checkout */
export interface GuestBookingFormData {
  carId: string;
  bookingType: string;
  fromDate: string;
  toDate: string;
  pickupTime?: string;
  flightNumber?: string;
  pickupAddress: string;
  dropOffAddress?: string;
  sameLocation: boolean;
  // Guest details
  name: string;
  email: string;
  phoneNumber: string;
}

/** Cost breakdown data */
export interface CostBreakdownData {
  baseRate: number;
  /** List rate before promotion discount (UI strikethrough); set only when a promotion applies. */
  originalBaseRate?: number;
  totalDays: number;
  baseTotal: number;
  platformFee: number;
  platformFeeRate: number;
  vat: number;
  vatRate: number;
  fuelUpgradeCost: number;
  referralDiscountAmount?: number;
  creditsUsed?: number;
  subtotalAfterDiscounts?: number;
  finalTotal: number;
  /** Pre-discount grand total (rental + platform + fuel + VAT); only when a promotion applies. */
  originalGrandTotal?: number;
  /** `originalGrandTotal - finalTotal` for “You save …” copy. */
  savingsAmount?: number;
  /** hireApp `BookingAddons` fuel note (null when not shown). */
  fuelNote: string | null;
}
