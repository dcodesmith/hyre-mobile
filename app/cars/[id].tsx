import {
  AirportTripDetails,
  AirportTripDetailsSkeleton,
  BookingAddons,
  BookingCreditsToggle,
  BookingDetailsCard,
  BookingPhoneVerification,
  BookingRate,
  CarDetailSkeleton,
  CarImageCarousel,
  CarInformationAccordion,
  CarReviewsSection,
  CostBreakdown,
  OrderTotal,
  GuestDetailsForm,
  StickyBottomBar,
} from "@/components/car-detail";
import { useAirportPickupBooking } from "@/hooks/use-airport-pickup-booking";
import { useAuth } from "@/hooks/use-auth";
import { useBookingCheckout } from "@/hooks/use-booking-checkout";
import { useBookingPhoneVerification } from "@/hooks/use-booking-phone-verification";
import { useCarBookingForm } from "@/hooks/use-car-booking-form";
import { useCarDetailPricing } from "@/hooks/use-car-detail-pricing";
import { useCarDetail } from "@/hooks/use-car-detail";
import { useGuestCheckoutForm } from "@/hooks/use-guest-checkout-form";
import { getBookingIdentityVisibility } from "@/lib/booking-card-display";
import { AIRPORT_PICKUP_BOOKING_TYPE } from "@/lib/booking-types";
import { isExpoIos } from "@/lib/expo-platform";
import { hasActivePromotion } from "@/lib/promotion-utils";
import { parseSearchId } from "@/lib/search-id";
import { buildCarSignInRedirectPath } from "@/lib/sign-in-redirect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function CarDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, refreshUser, user } = useAuth();
  const [stickyBottomBarHeight, setStickyBottomBarHeight] = useState(0);
  const [isBookingCardOpen, setIsBookingCardOpen] = useState(true);
  const params = useLocalSearchParams<{
    id: string;
    searchId?: string;
    from?: string;
    to?: string;
    bookingType?: string;
    pickupTime?: string;
    flightNumber?: string;
    pickupAddress?: string;
    dropOffAddress?: string;
    sameLocation?: string;
  }>();
  const searchId = parseSearchId(params.searchId);

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
  const phoneVerification = useBookingPhoneVerification({
    isAuthenticated,
    identityKey: isAuthenticated ? (user?.id ?? "authenticated") : "guest",
    initialPhoneNumber: isAuthenticated ? (user?.phoneNumber ?? "") : "",
    initiallyVerified: isAuthenticated && user?.phoneVerified === true,
    onVerified: isAuthenticated ? refreshUser : undefined,
  });
  const identityVisibility = getBookingIdentityVisibility({
    isAuthenticated,
    phoneVerified: phoneVerification.phoneVerified,
  });
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
    availableCredits,
    creditLimit,
    useCredits,
  } = useCarDetailPricing({ car, booking, isAuthenticated });

  // Inline error messages (below each field) come from the RHF instances, so
  // `validate` only decides whether to proceed with submission.
  const validate = useCallback(async () => {
    const revealCard = () => setIsBookingCardOpen(true);

    if (airportPickup.flightError) {
      revealCard();
      return false;
    }

    const isAirport =
      booking.values.bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
    if (isAirport && !booking.values.pickupTime?.trim()) {
      revealCard();
      return false;
    }

    if (isAuthenticated) {
      const bookingValid = await booking.form.trigger();
      const valid = phoneVerification.phoneVerified && bookingValid;
      if (!valid) revealCard();
      return valid;
    }

    const [bookingValid, guestValid] = await Promise.all([
      booking.form.trigger(),
      guest.form.trigger(["name", "email"]),
    ]);
    const valid =
      bookingValid && guestValid && phoneVerification.phoneVerified;
    if (!valid) revealCard();
    return valid;
  }, [
    airportPickup.flightError,
    booking.form,
    booking.values.bookingType,
    booking.values.pickupTime,
    guest.form,
    isAuthenticated,
    phoneVerification.phoneVerified,
  ]);

  const resetPhoneVerification = phoneVerification.reset;
  const handlePhoneVerificationRequired = useCallback(() => {
    resetPhoneVerification();
    setIsBookingCardOpen(true);
  }, [resetPhoneVerification]);

  const { submit, isSubmitting, paymentError } = useBookingCheckout({
    carId,
    searchId,
    isAuthenticated,
    requiresFullTank,
    useCredits,
    addonIds: selectedAddonIds,
    authoritativeTotal,
    validate,
    getBookingValues: booking.form.getValues,
    getGuestValues: guest.form.getValues,
    phoneNumber: phoneVerification.phoneNumber,
    phoneVerificationToken: phoneVerification.verificationToken,
    onPhoneVerificationRequired: handlePhoneVerificationRequired,
    onPriceChanged: handlePriceChanged,
  });

  const handleSignIn = useCallback(() => {
    router.push(
      buildCarSignInRedirectPath(carId, {
        searchId,
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
  }, [router, carId, searchId, booking.values]);

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
  const paymentPanel = (
    <StickyBottomBar
      sticky={isBookingCardOpen}
      isSubmitting={
        isSubmitting ||
        airportPickup.isValidatingFlight ||
        airportPickup.isCalculatingDuration
      }
      disabled={
        !pricingIsAuthoritative ||
        !phoneVerification.phoneVerified ||
        phoneVerification.isSubmitting
      }
      onPayNow={submit}
      onSignIn={handleSignIn}
      error={paymentError ?? airportPickup.flightError ?? pricingPreviewError}
      isAuthenticated={isAuthenticated}
      onLayout={(event) =>
        setStickyBottomBarHeight(event.nativeEvent.layout.height)
      }
    >
      <OrderTotal
        total={effectivePricing.finalTotal}
        savingsAmount={effectivePricing.savingsAmount}
      />
    </StickyBottomBar>
  );

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
          <Text className="px-4 mt-3 mb-1 text-xl font-bold">
            {carName}
          </Text>
          <View className="mb-4 px-4">
            <BookingRate
              pricing={effectivePricing}
              bookingType={booking.values.bookingType}
            />
          </View>

          <View className="gap-4 bg-white px-4" collapsable={false}>
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
              guestDetails={
                identityVisibility.showGuestDetails ? (
                  <GuestDetailsForm
                    name={guest.values.name}
                    email={guest.values.email}
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
                    errors={guest.errors}
                  />
                ) : undefined
              }
              phoneVerification={
                identityVisibility.showPhoneVerification ? (
                  <BookingPhoneVerification phone={phoneVerification} />
                ) : undefined
              }
              addons={
                <BookingAddons
                  addons={addons}
                  addonsLoading={addonsLoading}
                  selectedAddonIds={selectedAddonIds}
                  onSelectionChange={toggleAddon}
                />
              }
              isOpen={isBookingCardOpen}
              onOpenChange={setIsBookingCardOpen}
              tripDetails={
                booking.values.bookingType ===
                AIRPORT_PICKUP_BOOKING_TYPE ? (
                  <>
                    {airportPickup.tripError ? (
                      <View
                        className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2"
                        accessibilityRole="alert"
                      >
                        <Text className="text-sm text-red-800">
                          {airportPickup.tripError}
                        </Text>
                      </View>
                    ) : null}
                    {booking.values.dropOffAddress?.trim() &&
                    airportPickup.hasValidatedFlight &&
                    (airportPickup.isCalculatingDuration ||
                      airportPickup.tripEstimation) ? (
                      airportPickup.isCalculatingDuration ? (
                        <AirportTripDetailsSkeleton />
                      ) : airportPickup.tripEstimation ? (
                        <AirportTripDetails
                          estimation={airportPickup.tripEstimation}
                        />
                      ) : null
                    ) : null}
                  </>
                ) : undefined
              }
            />
          </View>

          {availableCredits > 0 && creditLimit > 0 ? (
            <View className="mt-4 px-4">
            <BookingCreditsToggle
              availableCredits={availableCredits}
              creditLimit={creditLimit}
              applyCredits={applyCredits}
              onApplyCreditsChange={setApplyCredits}
            />
            </View>
          ) : null}

          <View className="mt-4 bg-gray-100">
            <View className="px-4 py-4">
              <CostBreakdown
                pricing={effectivePricing}
                bookingType={booking.values.bookingType}
                pricingPreview={pricingPreview}
                estimatedAddons={estimatedAddons}
              />
            </View>
            {isBookingCardOpen ? (
              <View style={{ height: stickyBottomBarHeight }} />
            ) : (
              paymentPanel
            )}
          </View>
        </ScrollView>

        {isBookingCardOpen ? paymentPanel : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
