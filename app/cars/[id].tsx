import {
  AirportTripDetails,
  AirportTripDetailsSkeleton,
  BookingDetailsCard,
  CarImageCarousel,
  CarInformationAccordion,
  CarReviewsSection,
  CostBreakdown,
  GuestDetailsForm,
  StickyBottomBar,
} from "@/components/car-detail";
import { useAirportPickupBooking } from "@/hooks/use-airport-pickup-booking";
import { useAuth } from "@/hooks/use-auth";
import { useBookingCheckout } from "@/hooks/use-booking-checkout";
import {
  DEFAULT_PLATFORM_FEE_RATE,
  DEFAULT_VAT_RATE,
  useBookingPricing,
} from "@/hooks/use-booking-pricing";
import {
  bookingPricingPreviewQueryKey,
  useBookingPricingPreview,
} from "@/hooks/use-booking-pricing-preview";
import { useCarBookingForm } from "@/hooks/use-car-booking-form";
import { useCarDetail } from "@/hooks/use-car-detail";
import { useGuestCheckoutForm } from "@/hooks/use-guest-checkout-form";
import { useRates } from "@/hooks/use-rates";
import type {
  BookingPricingPreviewRequest,
  BookingPricingPreviewResponse,
} from "@/lib/booking-pricing-preview-types";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
  DAY_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
  NIGHT_PICKUP_TIME,
} from "@/lib/booking-types";
import {
  calculateBookingUnits,
  normalizeBookingTimeWindow,
} from "@/lib/booking-utils";
import { isExpoIos } from "@/lib/expo-platform";
import { hasActivePromotion } from "@/lib/promotion-utils";
import { buildCarSignInRedirectPath } from "@/lib/sign-in-redirect";
import { cn } from "@/lib/utils";
import { getBookingPricingPreviewErrorMessage } from "@/services/booking-pricing-preview";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function resolvePlatformFeeRate(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  // Rates API: explicit 0 is valid (hireApp parity); fall back only when non-finite/negative.
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_PLATFORM_FEE_RATE;
}

function resolveVatRate(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  // VAT of 0 falls back to the default (hireApp parity) because it isn't a valid VAT configuration.
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_VAT_RATE;
}

function listRateForBookingType(
  bookingType: BookingType,
  rates: {
    dayRate: number;
    nightRate: number | null;
    fullDayRate: number | null;
    airportPickupRate: number | null;
  },
): number {
  if (bookingType === NIGHT_BOOKING_TYPE)
    return rates.nightRate ?? rates.dayRate;
  if (bookingType === FULL_DAY_BOOKING_TYPE)
    return rates.fullDayRate ?? rates.dayRate;
  if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
    return rates.airportPickupRate ?? rates.dayRate;
  }
  return rates.dayRate;
}

function CarDetailSkeleton() {
  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="h-64 w-full bg-gray-200/80 animate-pulse" />
        <View className="px-4 pt-4 gap-4">
          <View className="h-5 w-48 rounded bg-gray-200/80 animate-pulse" />
          <View className="h-16 w-full rounded-xl bg-gray-200/80 animate-pulse" />
          <View className="h-14 w-full rounded-xl bg-gray-200/80 animate-pulse" />

          <View className="mt-2 rounded border border-neutral-200 bg-white">
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="h-6 w-28 rounded bg-gray-200/80 animate-pulse" />
              <View className="h-4 w-20 rounded bg-gray-200/80 animate-pulse" />
            </View>
            <View className="px-4 pb-6">
              <View className="h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />

              <View className="mt-4 h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 flex-row gap-2">
                <View className="h-10 flex-1 rounded-md bg-gray-200/80 animate-pulse" />
                <View className="h-10 flex-1 rounded-md bg-gray-200/80 animate-pulse" />
              </View>

              <View className="mt-4 h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />

              <View className="mt-4 h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />

              <View className="mt-4 flex-row items-center gap-2">
                <View className="h-5 w-5 rounded bg-gray-200/80 animate-pulse" />
                <View className="h-4 w-52 rounded bg-gray-200/80 animate-pulse" />
              </View>

              <View className="mt-4 h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />
            </View>
          </View>

          <View className="mt-2 h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
          <View className="h-40 w-full rounded-xl bg-gray-200/80 animate-pulse" />
        </View>
        <View className="h-40" />
      </ScrollView>
      <View className="border-t border-gray-200 bg-white px-4 py-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="h-4 w-10 rounded bg-gray-200/80 animate-pulse" />
          <View className="h-5 w-24 rounded bg-gray-200/80 animate-pulse" />
        </View>
        <View className="mt-3 h-10 w-full rounded-full bg-gray-200/80 animate-pulse" />
        <View className="mt-3 h-4 w-36 self-center rounded bg-gray-200/80 animate-pulse" />
      </View>
    </View>
  );
}

export default function CarDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    from?: string;
    to?: string;
    bookingType?: string;
    pickupTime?: string;
    flightNumber?: string;
    pickupAddress?: string;
    dropOffAddress?: string;
    sameLocation?: string;
  }>();

  // `/cars/[id]` always includes this segment in normal app navigation (wrong ids fail via API).
  const carId = (Array.isArray(params.id) ? params.id[0] : params.id) as string;
  const fromParam = params.from;
  const fromForApi = Array.isArray(fromParam) ? fromParam[0] : fromParam;

  const {
    data: car,
    isLoading,
    error,
  } = useCarDetail(carId, { from: fromForApi });
  const { data: ratesResponse } = useRates();
  const platformFeeRate = resolvePlatformFeeRate(
    ratesResponse?.platformCustomerServiceFeeRatePercent,
  );
  const vatRate = resolveVatRate(ratesResponse?.vatRatePercent);

  const booking = useCarBookingForm({
    bookingType: params.bookingType,
    from: params.from,
    to: params.to,
    pickupTime: params.pickupTime,
    flightNumber: params.flightNumber,
    pickupAddress: params.pickupAddress,
    dropOffAddress: params.dropOffAddress,
    sameLocation: params.sameLocation,
  });
  const airportPickup = useAirportPickupBooking({ booking });
  const guest = useGuestCheckoutForm();

  const [requiresFullTank, setRequiresFullTank] = useState(false);

  const bookingTypeRef = useRef(booking.values.bookingType);
  useEffect(() => {
    if (bookingTypeRef.current === booking.values.bookingType) return;
    bookingTypeRef.current = booking.values.bookingType;
    setRequiresFullTank(false);
  }, [booking.values.bookingType]);

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

  // `calculateBookingUnits` returns 1 when dates are unset, so switching
  // booking type (which clears dates) still shows a per-unit preview + VAT.
  const pricing = useBookingPricing({
    dayRate: car?.dayRate ?? 0,
    nightRate: car?.nightRate,
    fullDayRate: car?.fullDayRate,
    airportPickupRate: car?.airportPickupRate,
    bookingType: booking.values.bookingType,
    totalDays,
    platformFeeRate,
    vatRate,
    requiresFullTank,
    fullTankUpgradeFee: car?.fuelUpgradeRate ?? 0,
    pricingIncludesFuel: car?.pricingIncludesFuel ?? false,
    promotion: car?.promotion ?? null,
  });

  const previewWindow = useMemo(() => {
    const from = booking.values.dateRange.from;
    const to = booking.values.dateRange.to;

    if (!from || !to) {
      return null;
    }

    return normalizeBookingTimeWindow({
      bookingType: booking.values.bookingType,
      startDate: from,
      endDate: to,
      pickupTime: booking.values.pickupTime,
    });
  }, [
    booking.values.bookingType,
    booking.values.dateRange.from,
    booking.values.dateRange.to,
    booking.values.pickupTime,
  ]);

  const pricingPreviewRequest =
    useMemo<BookingPricingPreviewRequest | null>(() => {
      if (!car || !previewWindow) {
        return null;
      }

      if (
        previewWindow.endDate.getTime() <= previewWindow.startDate.getTime()
      ) {
        return null;
      }

      const pickupTime =
        booking.values.bookingType === NIGHT_BOOKING_TYPE
          ? NIGHT_PICKUP_TIME
          : booking.values.pickupTime;
      if (!pickupTime?.trim()) {
        return null;
      }

      return {
        carId: car.id,
        bookingType: booking.values.bookingType,
        startDate: previewWindow.startDate.toISOString(),
        endDate: previewWindow.endDate.toISOString(),
        pickupTime,
        includeSecurityDetail: false,
        requiresFullTank:
          booking.values.bookingType === DAY_BOOKING_TYPE
            ? requiresFullTank
            : false,
      };
    }, [
      booking.values.bookingType,
      booking.values.pickupTime,
      car,
      previewWindow,
      requiresFullTank,
    ]);

  const pricingPreviewQuery = useBookingPricingPreview(
    pricingPreviewRequest,
    isAuthenticated,
  );
  const queryClient = useQueryClient();
  const { data: pricingPreview } = pricingPreviewQuery;
  const pricingIsAuthoritative =
    pricingPreviewRequest !== null &&
    pricingPreview !== undefined &&
    !pricingPreviewQuery.isFetching &&
    !pricingPreviewQuery.isError;
  const pricingPreviewError = pricingPreviewQuery.isError
    ? getBookingPricingPreviewErrorMessage(pricingPreviewQuery.error)
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

  const effectivePricing = useMemo(() => {
    if (!car || !pricingPreview) {
      return pricing;
    }

    const listRate = listRateForBookingType(booking.values.bookingType, {
      dayRate: car.dayRate,
      nightRate: car.nightRate,
      fullDayRate: car.fullDayRate,
      airportPickupRate: car.airportPickupRate,
    });

    const promoHeaderUnitPrice =
      pricingPreview.segments.find((segment) => segment.kind === "PROMO")
        ?.unitPrice ?? null;
    const hasAnyPromoDiscount = pricingPreview.discountCoverage !== "NONE";
    const effectiveHeaderUnitPrice = promoHeaderUnitPrice ?? pricing.baseRate;
    const shouldShowHeaderPromoStrike =
      hasAnyPromoDiscount && listRate > effectiveHeaderUnitPrice;
    const originalGrandTotal =
      pricingPreview.compareAtTotalAmount > pricingPreview.totalAmount
        ? pricingPreview.compareAtTotalAmount
        : undefined;
    const savingsAmount =
      pricingPreview.savingsAmount > 0
        ? pricingPreview.savingsAmount
        : undefined;

    return {
      ...pricing,
      baseRate: effectiveHeaderUnitPrice,
      originalBaseRate: shouldShowHeaderPromoStrike ? listRate : undefined,
      baseTotal: pricingPreview.baseTotal,
      platformFee: pricingPreview.platformFeeAmount,
      platformFeeRate: pricingPreview.platformFeeRatePercent,
      vat: pricingPreview.vatAmount,
      vatRate: pricingPreview.vatRatePercent,
      fuelUpgradeCost: pricingPreview.fuelUpgradeCost,
      referralDiscountAmount: pricingPreview.referralDiscountAmount,
      creditsUsed: pricingPreview.creditsUsed,
      subtotalAfterDiscounts: pricingPreview.subtotalAfterDiscounts,
      finalTotal: pricingPreview.totalAmount,
      originalGrandTotal,
      savingsAmount,
    };
  }, [booking.values.bookingType, car, pricing, pricingPreview]);

  // Inline error messages (below each field) come from the RHF instances, so
  // `validate` only decides whether to proceed with submission.
  const validate = useCallback(async () => {
    if (airportPickup.flightError) {
      return false;
    }

    const isAirport =
      booking.values.bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
    if (isAirport && !booking.values.pickupTime?.trim()) {
      return false;
    }

    if (isAuthenticated) {
      return booking.form.trigger();
    }

    const [bookingValid, guestValid] = await Promise.all([
      booking.form.trigger(),
      guest.form.trigger(["name", "email", "phoneNumber"]),
    ]);

    return bookingValid && guestValid;
  }, [
    airportPickup.flightError,
    booking.form,
    booking.values.bookingType,
    booking.values.pickupTime,
    guest.form,
    isAuthenticated,
  ]);

  const { submit, isSubmitting, paymentError } = useBookingCheckout({
    carId,
    isAuthenticated,
    requiresFullTank,
    authoritativeTotal: pricingIsAuthoritative
      ? (pricingPreview?.totalAmount ?? null)
      : null,
    validate,
    getBookingValues: booking.form.getValues,
    getGuestValues: guest.form.getValues,
    onPriceChanged: handlePriceChanged,
  });

  const handleSignIn = useCallback(() => {
    router.push(
      buildCarSignInRedirectPath(carId, {
        bookingType: booking.values.bookingType,
        fromDate: booking.values.dateRange.from,
        toDate: booking.values.dateRange.to,
        pickupTime: booking.values.pickupTime,
        flightNumber: booking.values.flightNumber,
        pickupAddress: booking.values.pickupAddress,
        dropOffAddress: booking.values.dropOffAddress,
        sameLocation: booking.values.sameLocation,
      }),
    );
  }, [router, carId, booking.values]);

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["left", "right", "bottom"]}
      >
        <KeyboardAvoidingView
          behavior={isExpoIos ? "padding" : "height"}
          className="flex-1"
        >
          <CarDetailSkeleton />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (error || !car) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["left", "right", "bottom"]}
      >
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-lg font-semibold text-gray-900">
            Car not found
          </Text>
          <Text className="mt-2 text-sm text-gray-500 text-center">
            {"The car you're looking for doesn't exist or has been removed."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const carName = `${car.make} ${car.model} (${car.year})`;
  const statusBarScrimHeight = Math.max(insets.top, 24);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["left", "right", "bottom"]}
    >
      <StatusBar style="light" />
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 z-20"
        style={{
          height: statusBarScrimHeight,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      />
      <KeyboardAvoidingView
        behavior={isExpoIos ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
        >
          <CarImageCarousel
            images={car.images}
            carName={carName}
            promotionDiscountPercent={
              hasActivePromotion(car.promotion)
                ? car.promotion.discountValue
                : null
            }
          />
          <View className="px-4">
            <CarReviewsSection carId={car.id} />
          </View>

          <View className="bg-white px-4 pt-0" collapsable={false}>
            <CarInformationAccordion car={car} />
            <BookingDetailsCard
              car={car}
              booking={booking}
              pricing={effectivePricing}
              totalDays={totalDays}
              requiresFullTank={requiresFullTank}
              onRequiresFullTankChange={setRequiresFullTank}
              flightError={airportPickup.flightError}
              isValidatingFlight={airportPickup.isValidatingFlight}
              onDropOffAddressSelected={(address) => {
                airportPickup
                  .handleDropOffAddressSelected(address)
                  .catch(() => undefined);
              }}
            />
          </View>

          {/* hireApp parity: outer column has `space-y-4` (16px) and a section bottom-pad
              sized to clear the sticky footer (pb-40 auth / pb-48 guest). */}
          <View
            className={cn(
              "flex-col px-4 mt-4 gap-4",
              isAuthenticated ? "pb-40" : "pb-48",
            )}
          >
            {!isAuthenticated && (
              <View>
                <Text className="mb-2 text-sm font-semibold text-gray-950">
                  Guest Details
                </Text>
                <GuestDetailsForm
                  name={guest.values.name}
                  email={guest.values.email}
                  phoneNumber={guest.values.phoneNumber}
                  onNameChange={(value) =>
                    guest.form.setValue("name", value, {
                      shouldDirty: true,
                      shouldValidate: Boolean(guest.errors.name),
                    })
                  }
                  onEmailChange={(value) =>
                    guest.form.setValue("email", value, {
                      shouldDirty: true,
                      shouldValidate: Boolean(guest.errors.email),
                    })
                  }
                  onPhoneNumberChange={(value) =>
                    guest.form.setValue("phoneNumber", value, {
                      shouldDirty: true,
                      shouldValidate: Boolean(guest.errors.phoneNumber),
                    })
                  }
                  errors={guest.errors}
                />
              </View>
            )}

            {booking.values.bookingType === AIRPORT_PICKUP_BOOKING_TYPE &&
            booking.values.dropOffAddress?.trim() &&
            airportPickup.hasValidatedFlight &&
            (airportPickup.isCalculatingDuration ||
              airportPickup.tripEstimation) ? (
              <View>
                {airportPickup.isCalculatingDuration ? (
                  <AirportTripDetailsSkeleton />
                ) : airportPickup.tripEstimation ? (
                  <AirportTripDetails
                    estimation={airportPickup.tripEstimation}
                  />
                ) : null}
              </View>
            ) : null}

            <View>
              <Text className="mb-2 text-sm font-semibold text-gray-950">
                Cost Breakdown
              </Text>
              <CostBreakdown
                pricing={effectivePricing}
                bookingType={booking.values.bookingType}
                pricingPreview={pricingPreview}
                hideTotal
              />
            </View>
          </View>
        </ScrollView>

        <StickyBottomBar
          total={effectivePricing.finalTotal}
          originalTotal={effectivePricing.originalGrandTotal}
          savingsAmount={effectivePricing.savingsAmount}
          isSubmitting={
            isSubmitting ||
            airportPickup.isValidatingFlight ||
            airportPickup.isCalculatingDuration
          }
          disabled={!pricingIsAuthoritative}
          onPayNow={submit}
          onSignIn={handleSignIn}
          error={
            paymentError ?? airportPickup.flightError ?? pricingPreviewError
          }
          isAuthenticated={isAuthenticated}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
