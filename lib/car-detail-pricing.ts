import {
	AIRPORT_PICKUP_BOOKING_TYPE,
	type BookingType,
	DAY_BOOKING_TYPE,
	FULL_DAY_BOOKING_TYPE,
	NIGHT_BOOKING_TYPE,
	NIGHT_PICKUP_TIME,
} from "./booking-types";
import type {
	BookingPricingPreviewRequest,
	BookingPricingPreviewResponse,
} from "./booking-pricing-preview-types";
import { normalizeBookingTimeWindow } from "./booking-utils";
import type { CostBreakdownData } from "./car-detail-types";

export const DEFAULT_PLATFORM_FEE_RATE = 0;
export const DEFAULT_VAT_RATE = 7.5;

type BookingRates = {
	dayRate: number;
	nightRate?: number | null;
	fullDayRate?: number | null;
	airportPickupRate?: number | null;
};

function toConfiguredRate(raw: unknown): number | undefined {
	if (
		raw === null ||
		raw === undefined ||
		(typeof raw === "string" && raw.trim() === "")
	) {
		return undefined;
	}
	const rate = typeof raw === "number" ? raw : Number(raw);
	return Number.isFinite(rate) ? rate : undefined;
}

export function resolvePlatformFeeRate(raw: unknown): number {
	const rate = toConfiguredRate(raw);
	// An explicit zero is valid; only invalid or negative values use the fallback.
	return rate !== undefined && rate >= 0 ? rate : DEFAULT_PLATFORM_FEE_RATE;
}

export function resolveVatRate(raw: unknown): number {
	const rate = toConfiguredRate(raw);
	// Zero is not a valid VAT configuration and must use the worker-aligned default.
	return rate !== undefined && rate > 0 ? rate : DEFAULT_VAT_RATE;
}

export function getListRateForBookingType(
	bookingType: BookingType,
	rates: BookingRates,
): number {
	if (bookingType === NIGHT_BOOKING_TYPE) {
		return rates.nightRate ?? rates.dayRate;
	}
	if (bookingType === FULL_DAY_BOOKING_TYPE) {
		return rates.fullDayRate ?? rates.dayRate;
	}
	if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
		return rates.airportPickupRate ?? rates.dayRate;
	}
	return rates.dayRate;
}

export function buildBookingPricingPreviewRequest({
	carId,
	bookingType,
	from,
	to,
	pickupTime,
	requiresFullTank,
	useCredits,
}: {
	carId: string | undefined;
	bookingType: BookingType;
	from: Date | undefined;
	to: Date | undefined;
	pickupTime: string | undefined;
	requiresFullTank: boolean;
	useCredits: number;
}): BookingPricingPreviewRequest | null {
	if (!carId || !from || !to) return null;

	const window = normalizeBookingTimeWindow({
		bookingType,
		startDate: from,
		endDate: to,
		pickupTime,
	});
	if (window.endDate.getTime() <= window.startDate.getTime()) return null;

	const resolvedPickupTime =
		bookingType === NIGHT_BOOKING_TYPE ? NIGHT_PICKUP_TIME : pickupTime;
	if (!resolvedPickupTime?.trim()) return null;

	return {
		carId,
		bookingType,
		startDate: window.startDate.toISOString(),
		endDate: window.endDate.toISOString(),
		pickupTime: resolvedPickupTime,
		includeSecurityDetail: false,
		requiresFullTank:
			bookingType === DAY_BOOKING_TYPE ? requiresFullTank : false,
		useCredits,
	};
}

export function mergeBookingPricingPreview(
	pricing: CostBreakdownData,
	preview: BookingPricingPreviewResponse | undefined,
	bookingType: BookingType,
	rates: BookingRates | undefined,
): CostBreakdownData {
	if (!preview || !rates) return pricing;

	const listRate = getListRateForBookingType(bookingType, rates);
	const promoHeaderUnitPrice =
		preview.segments.find((segment) => segment.kind === "PROMO")?.unitPrice ??
		null;
	const hasAnyPromoDiscount = preview.discountCoverage !== "NONE";
	const effectiveHeaderUnitPrice = promoHeaderUnitPrice ?? pricing.baseRate;
	const shouldShowHeaderPromoStrike =
		hasAnyPromoDiscount && listRate > effectiveHeaderUnitPrice;

	return {
		...pricing,
		baseRate: effectiveHeaderUnitPrice,
		originalBaseRate: shouldShowHeaderPromoStrike ? listRate : undefined,
		baseTotal: preview.baseTotal,
		platformFee: preview.platformFeeAmount,
		platformFeeRate: preview.platformFeeRatePercent,
		vat: preview.vatAmount,
		vatRate: preview.vatRatePercent,
		fuelUpgradeCost: preview.fuelUpgradeCost,
		referralDiscountAmount: preview.referralDiscountAmount,
		creditsUsed: preview.creditsUsed,
		subtotalAfterDiscounts: preview.subtotalAfterDiscounts,
		finalTotal: preview.totalAmount,
		originalGrandTotal:
			preview.compareAtTotalAmount > preview.totalAmount
				? preview.compareAtTotalAmount
				: undefined,
		savingsAmount:
			preview.savingsAmount > 0 ? preview.savingsAmount : undefined,
	};
}
