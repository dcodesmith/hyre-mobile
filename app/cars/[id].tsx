import {
  AirportTripDetails,
  AirportTripDetailsSkeleton,
  BookingAddons,
  BookingDetailsCard,
  CarDetailSkeleton,
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
import { AIRPORT_PICKUP_BOOKING_TYPE } from "@/lib/booking-types";
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
    pricingIsAuthoritative,
    authoritativeTotal,
    handlePriceChanged,
    addons,
    addonsLoading,
    estimatedAddons,
    selectedAddonIds,
    toggleAddon,
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
    addonIds: selectedAddonIds,
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
          <Text className="px-4 mt-3 mb-2 text-xl font-bold">
            {car.make} {car.model} - {car.year}
          </Text>

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

            <BookingAddons
              addons={addons}
              addonsLoading={addonsLoading}
              selectedAddonIds={selectedAddonIds}
              onSelectionChange={toggleAddon}
            />

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
                estimatedAddons={estimatedAddons}
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
