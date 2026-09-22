import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBookingPricing } from "@/hooks/use-booking-pricing";
import {
	bookingPricingPreviewQueryKey,
	useBookingPricingPreview,
} from "@/hooks/use-booking-pricing-preview";
import type { CarBookingFormReturn } from "@/hooks/use-car-booking-form";
import { usePublicAddons } from "@/hooks/use-public-addons";
import { useRates } from "@/hooks/use-rates";
import { useReferralSummary } from "@/hooks/use-referrals";
import {
	addonCatalogKey,
	selectedBookingPricingAddons,
	toggleSelectedAddonId,
} from "@/lib/booking-addons";
import { getBookingCreditsToUse } from "@/lib/booking-credits";
import type { BookingPricingPreviewResponse } from "@/lib/booking-pricing-preview-types";
import { calculateBookingUnits } from "@/lib/booking-utils";
import type { CarDetail } from "@/lib/car-detail-types";
import {
	addEstimatedAddonPricing,
	buildBookingPricingPreviewRequest,
	mergeBookingPricingPreview,
	resolvePlatformFeeRate,
	resolveVatRate,
} from "@/lib/car-detail-pricing";
import { getBookingPricingPreviewErrorMessage } from "@/services/booking-pricing-preview";

const EMPTY_ADDON_IDS: readonly string[] = [];

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
	const { data: rates } = useRates();
	const { data: referralSummary } = useReferralSummary(isAuthenticated);
	const addonsQuery = usePublicAddons(booking.values.bookingType);
	const addons = addonsQuery.data ?? [];
	const catalogKey = addonCatalogKey(addons);
	const [addonSelection, setAddonSelection] = useState({
		catalogKey: "",
		ids: [] as string[],
	});
	const selectedAddonIds =
		addonSelection.catalogKey === catalogKey
			? addonSelection.ids
			: EMPTY_ADDON_IDS;
	const [requiresFullTank, setRequiresFullTank] = useState(false);
	const [applyCredits, setApplyCredits] = useState(false);

	const availableCredits = referralSummary?.stats.availableCredits ?? 0;
	const walletCreditLimit = getBookingCreditsToUse(
		isAuthenticated,
		availableCredits,
		referralSummary?.stats.maxCreditsPerBooking ?? 0,
	);
	const useCredits = applyCredits ? walletCreditLimit : 0;

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
		platformFeeRate: resolvePlatformFeeRate(
			rates?.platformCustomerServiceFeeRatePercent,
		),
		vatRate: resolveVatRate(rates?.vatRatePercent),
		requiresFullTank,
		fullTankUpgradeFee: car?.fuelUpgradeRate ?? 0,
		pricingIncludesFuel: car?.pricingIncludesFuel ?? false,
		promotion: car?.promotion ?? null,
	});
	const estimatedAddons = useMemo(
		() => selectedBookingPricingAddons(addons, selectedAddonIds, totalDays),
		[addons, selectedAddonIds, totalDays],
	);
	const estimatedPricing = useMemo(
		() =>
			addEstimatedAddonPricing(
				pricing,
				estimatedAddons.reduce((total, addon) => total + addon.totalPrice, 0),
			),
		[estimatedAddons, pricing],
	);

	const toggleAddon = useCallback(
		(addonId: string, selected: boolean) => {
			setAddonSelection((current) => {
				const ids = current.catalogKey === catalogKey ? current.ids : [];
				return {
					catalogKey,
					ids: toggleSelectedAddonId(ids, addonId, selected),
				};
			});
		},
		[catalogKey],
	);

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
				addonIds: selectedAddonIds,
			}),
		[
			booking.values.bookingType,
			booking.values.dateRange.from,
			booking.values.dateRange.to,
			booking.values.pickupTime,
			car?.id,
			requiresFullTank,
			selectedAddonIds,
			useCredits,
		],
	);
	const previewQuery = useBookingPricingPreview(
		pricingPreviewRequest,
		isAuthenticated,
	);
	const pricingPreview = previewQuery.data;
	const applicableCreditsKey = pricingPreviewRequest
		? [
				pricingPreviewRequest.carId,
				pricingPreviewRequest.bookingType,
				pricingPreviewRequest.startDate,
				pricingPreviewRequest.endDate,
				pricingPreviewRequest.pickupTime,
				[...pricingPreviewRequest.addonIds].sort().join(","),
				String(pricingPreviewRequest.requiresFullTank),
			].join("|")
		: "";
	const [lastApplicableCredits, setLastApplicableCredits] = useState({
		key: "",
		amount: 0,
	});
	const previewCreditsApplicable = pricingPreview?.creditsApplicable ?? 0;
	if (
		pricingPreview &&
		applicableCreditsKey &&
		(lastApplicableCredits.key !== applicableCreditsKey ||
			lastApplicableCredits.amount !== previewCreditsApplicable)
	) {
		setLastApplicableCredits({
			key: applicableCreditsKey,
			amount: previewCreditsApplicable,
		});
	}
	const thisBookingCredits = pricingPreview
		? previewCreditsApplicable
		: previewQuery.isFetching && lastApplicableCredits.key === applicableCreditsKey
			? lastApplicableCredits.amount
			: 0;

	useEffect(() => {
		if (
			!isAuthenticated ||
			walletCreditLimit <= 0 ||
			(pricingPreview && thisBookingCredits <= 0)
		) {
			setApplyCredits(false);
		}
	}, [isAuthenticated, pricingPreview, thisBookingCredits, walletCreditLimit]);

	const pricingIsAuthoritative =
		pricingPreviewRequest !== null &&
		pricingPreview !== undefined &&
		!previewQuery.isFetching &&
		!previewQuery.isError;
	const pricingPreviewError = previewQuery.isError
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
				estimatedPricing,
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
		[booking.values.bookingType, car, estimatedPricing, pricingPreview],
	);

	return {
		effectivePricing,
		totalDays,
		pricingPreview,
		pricingPreviewError,
		pricingIsAuthoritative,
		authoritativeTotal: pricingIsAuthoritative
			? (pricingPreview?.totalAmount ?? null)
			: null,
		handlePriceChanged,
		addons,
		addonsLoading: addonsQuery.isPending && addonsQuery.data === undefined,
		estimatedAddons,
		selectedAddonIds,
		toggleAddon,
		requiresFullTank,
		setRequiresFullTank,
		applyCredits,
		setApplyCredits,
		availableCredits,
		creditLimit: thisBookingCredits,
		useCredits,
	};
}
