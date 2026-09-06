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
import { useCarBookingForm } from "@/hooks/use-car-booking-form";
import { useCarDetailPricing } from "@/hooks/use-car-detail-pricing";
import { useCarDetail } from "@/hooks/use-car-detail";
import { useGuestCheckoutForm } from "@/hooks/use-guest-checkout-form";
import type { BookingPricingPreviewResponse } from "@/lib/booking-pricing-preview-types";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
} from "@/lib/booking-types";
import type { CostBreakdownData } from "@/lib/car-detail-types";
import { isExpoIos } from "@/lib/expo-platform";
import { hasActivePromotion } from "@/lib/promotion-utils";
import { buildCarSignInRedirectPath } from "@/lib/sign-in-redirect";
import { cn } from "@/lib/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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

function BookingPricingSection({
  bookingType,
  isLoading,
  preview,
  pricing,
}: {
  readonly bookingType: BookingType;
  readonly isLoading: boolean;
  readonly preview?: BookingPricingPreviewResponse;
  readonly pricing: CostBreakdownData;
}) {
  if (!isLoading && !preview) return null;

  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-gray-950">
        Cost Breakdown
      </Text>
      {isLoading ? (
        <View
          accessible
          className="rounded border border-neutral-200 bg-white p-4 shadow-xl"
          accessibilityLabel="Calculating price"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
        >
          {[0, 1, 2].map((row) => (
            <View
              key={row}
              className="mb-3 flex-row items-center justify-between last:mb-0"
            >
              <View className="h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
              <View className="h-4 w-20 rounded bg-gray-200/80 animate-pulse" />
            </View>
          ))}
        </View>
      ) : (
        <CostBreakdown
          pricing={pricing}
          bookingType={bookingType}
          pricingPreview={preview}
          hideTotal
        />
      )}
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
  const {
    effectivePricing,
    totalDays,
    pricingPreview,
    pricingPreviewError,
    pricingIsLoading,
    pricingIsAuthoritative,
    authoritativeTotal,
    handlePriceChanged,
    requiresFullTank,
    setRequiresFullTank,
    applyCredits,
    setApplyCredits,
    creditLimit,
    useCredits,
  } = useCarDetailPricing({ car, booking, isAuthenticated });

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
    useCredits,
    authoritativeTotal,
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
  const showPricingFooter = pricingIsLoading || pricingIsAuthoritative;
  let bookingContentBottomPadding = "pb-8";
  if (showPricingFooter) {
    bookingContentBottomPadding = isAuthenticated ? "pb-40" : "pb-48";
  }
  const originalPreviewTotal =
    pricingPreview &&
    pricingPreview.compareAtTotalAmount > pricingPreview.totalAmount
      ? pricingPreview.compareAtTotalAmount
      : undefined;

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
              creditsToUse={creditLimit}
              applyCredits={applyCredits}
              onApplyCreditsChange={setApplyCredits}
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
              bookingContentBottomPadding,
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
                ) : null}
                {!airportPickup.isCalculatingDuration &&
                airportPickup.tripEstimation ? (
                  <AirportTripDetails
                    estimation={airportPickup.tripEstimation}
                  />
                ) : null}
              </View>
            ) : null}

            <BookingPricingSection
              bookingType={booking.values.bookingType}
              isLoading={pricingIsLoading}
              preview={pricingPreview}
              pricing={effectivePricing}
            />
            {!pricingIsLoading && pricingPreviewError ? (
              <View
                accessible
                className="rounded-md border border-red-200 bg-red-50 p-3"
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                <Text className="text-sm text-red-800">
                  {pricingPreviewError}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {pricingIsLoading ? (
          <View
            accessible
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-xl border-t border-gray-200 bg-white p-4"
            style={{ paddingBottom: insets.bottom }}
            accessibilityLabel="Calculating total"
            accessibilityRole="progressbar"
            accessibilityState={{ busy: true }}
          >
            <View className="flex-row items-center justify-between gap-2">
              <View className="h-4 w-10 rounded bg-gray-200/80 animate-pulse" />
              <View className="h-5 w-20 rounded bg-gray-200/80 animate-pulse" />
            </View>
            <View className="mt-3 h-10 w-full rounded-full bg-gray-200/80 animate-pulse" />
          </View>
        ) : null}
        {pricingIsAuthoritative && pricingPreview ? (
          <StickyBottomBar
            total={pricingPreview.totalAmount}
            originalTotal={originalPreviewTotal}
            savingsAmount={pricingPreview.savingsAmount}
            isSubmitting={
              isSubmitting ||
              airportPickup.isValidatingFlight ||
              airportPickup.isCalculatingDuration
            }
            onPayNow={submit}
            onSignIn={handleSignIn}
            error={
              paymentError ?? airportPickup.flightError
            }
            isAuthenticated={isAuthenticated}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
