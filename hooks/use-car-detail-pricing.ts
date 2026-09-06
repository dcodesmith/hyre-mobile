import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBookingPricing } from "@/hooks/use-booking-pricing";
import {
	bookingPricingPreviewQueryKey,
	useBookingPricingPreview,
} from "@/hooks/use-booking-pricing-preview";
import type { CarBookingFormReturn } from "@/hooks/use-car-booking-form";
import { useReferralSummary } from "@/hooks/use-referrals";
import { getBookingCreditsToUse } from "@/lib/booking-credits";
import type { BookingPricingPreviewResponse } from "@/lib/booking-pricing-preview-types";
import { calculateBookingUnits } from "@/lib/booking-utils";
import type { CarDetail } from "@/lib/car-detail-types";
import {
	buildBookingPricingPreviewRequest,
	mergeBookingPricingPreview,
	resolveBookingPricingState,
} from "@/lib/car-detail-pricing";
import { getBookingPricingPreviewErrorMessage } from "@/services/booking-pricing-preview";

export function useCarDetailPricing({
	car,
	booking,
	isAuthenticated,
}: {
	car: CarDetail | undefined;
	booking: CarBookingFormReturn;
	isAuthenticated: boolean;
}) {
	const queryClient = useQueryClient();
	const { data: referralSummary } = useReferralSummary(isAuthenticated);
	const [requiresFullTank, setRequiresFullTank] = useState(false);
	const [applyCredits, setApplyCredits] = useState(false);

	const creditLimit = getBookingCreditsToUse(
		isAuthenticated,
		referralSummary?.stats.availableCredits ?? 0,
		referralSummary?.stats.maxCreditsPerBooking ?? 0,
	);
	const useCredits = applyCredits ? creditLimit : 0;

	useEffect(() => {
		if (!isAuthenticated || creditLimit <= 0) {
			setApplyCredits(false);
		}
	}, [creditLimit, isAuthenticated]);

	const bookingTypeRef = useRef(booking.values.bookingType);
	useEffect(() => {
		if (bookingTypeRef.current === booking.values.bookingType) return;
		bookingTypeRef.current = booking.values.bookingType;
		setRequiresFullTank(false);
	}, [booking.values.bookingType]);

	// Unset dates intentionally produce one unit so type changes retain a useful estimate.
	const totalDays = useMemo(
		() =>
			calculateBookingUnits(
				booking.values.dateRange.from,
				booking.values.dateRange.to,
				booking.values.bookingType,
			),
		[
			booking.values.dateRange.from,
			booking.values.dateRange.to,
			booking.values.bookingType,
		],
	);
	const pricing = useBookingPricing({
		dayRate: car?.dayRate ?? 0,
		nightRate: car?.nightRate,
		fullDayRate: car?.fullDayRate,
		airportPickupRate: car?.airportPickupRate,
		bookingType: booking.values.bookingType,
		totalDays,
		requiresFullTank,
		fullTankUpgradeFee: car?.fuelUpgradeRate ?? 0,
		pricingIncludesFuel: car?.pricingIncludesFuel ?? false,
		promotion: car?.promotion ?? null,
	});

	const pricingPreviewRequest = useMemo(
		() =>
			buildBookingPricingPreviewRequest({
				carId: car?.id,
				bookingType: booking.values.bookingType,
				from: booking.values.dateRange.from,
				to: booking.values.dateRange.to,
				pickupTime: booking.values.pickupTime,
				requiresFullTank,
				useCredits,
			}),
		[
			booking.values.bookingType,
			booking.values.dateRange.from,
			booking.values.dateRange.to,
			booking.values.pickupTime,
			car?.id,
			requiresFullTank,
			useCredits,
		],
	);
	const previewQuery = useBookingPricingPreview(
		pricingPreviewRequest,
		isAuthenticated,
	);
	const pricingPreview = previewQuery.data;
	const pricingState = resolveBookingPricingState({
		requested: pricingPreviewRequest !== null,
		hasPreview: pricingPreview !== undefined,
		isFetching: previewQuery.isFetching,
		isError: previewQuery.isError,
		isPaused: previewQuery.isPaused,
	});
	const pricingIsLoading = pricingState === "loading";
	const pricingIsAuthoritative = pricingState === "ready";
	const pricingPreviewError = pricingState === "error"
		? getBookingPricingPreviewErrorMessage(previewQuery.error)
		: null;

	const handlePriceChanged = useCallback(
		(currentPricing: BookingPricingPreviewResponse) => {
			if (!pricingPreviewRequest) return;
			queryClient.setQueryData(
				bookingPricingPreviewQueryKey(pricingPreviewRequest, isAuthenticated),
				currentPricing,
			);
		},
		[isAuthenticated, pricingPreviewRequest, queryClient],
	);

	const effectivePricing = useMemo(
		() =>
			mergeBookingPricingPreview(
				pricing,
				pricingPreview,
				booking.values.bookingType,
				car
					? {
							dayRate: car.dayRate,
							nightRate: car.nightRate,
							fullDayRate: car.fullDayRate,
							airportPickupRate: car.airportPickupRate,
						}
					: undefined,
			),
		[booking.values.bookingType, car, pricing, pricingPreview],
	);

	return {
		effectivePricing,
		totalDays,
		pricingPreview,
		pricingPreviewError,
		pricingIsLoading,
		pricingIsAuthoritative,
		authoritativeTotal: pricingIsAuthoritative
			? (pricingPreview?.totalAmount ?? null)
			: null,
		handlePriceChanged,
		requiresFullTank,
		setRequiresFullTank,
		applyCredits,
		setApplyCredits,
		creditLimit,
		useCredits,
	};
}
