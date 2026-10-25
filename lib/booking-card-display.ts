import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  BOOKING_TYPE_OPTIONS_MAP,
  type BookingType,
} from "./booking-types";

export function getBookingIdentityVisibility({
  isAuthenticated,
  phoneVerified,
}: {
  readonly isAuthenticated: boolean;
  readonly phoneVerified: boolean;
}) {
  return {
    showGuestDetails: !isAuthenticated,
    showPhoneVerification: !isAuthenticated || !phoneVerified,
  };
}

export function getBookingRentalCopy(
  bookingType: BookingType,
  units: number,
) {
  const option = BOOKING_TYPE_OPTIONS_MAP[bookingType];
  const title =
    bookingType === "DAY"
      ? "Same day"
      : bookingType === "FULL_DAY"
        ? "Full day"
        : bookingType === AIRPORT_PICKUP_BOOKING_TYPE
          ? "Airport pickup"
          : option.label;

  return {
    title,
    detail:
      option.duration === "Pickup" ? null : `(${option.duration}) x ${units}`,
  };
}
