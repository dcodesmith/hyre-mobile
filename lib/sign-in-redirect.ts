import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
} from "@/lib/booking-types";
import dayjs from "dayjs";

export type CarSignInRedirectValues = {
  bookingType: BookingType;
  fromDate?: Date;
  toDate?: Date;
  pickupTime?: string;
  flightNumber?: string;
  pickupAddress: string;
  dropOffAddress?: string;
  sameLocation: boolean;
};

/** Typed as a template literal so it satisfies expo-router's typed path union. */
export type CarSignInRedirectPath =
  `/(tabs)/login?redirectTo=/cars/${string}?${string}`;

/**
 * Builds the `/(tabs)/login?redirectTo=/cars/<id>?...` path that preserves the
 * user's in-progress booking selection across the sign-in round trip. Airport
 * bookings always force `sameLocation=false` (separate drop-off required).
 */
export function buildCarSignInRedirectPath(
  carId: string,
  values: CarSignInRedirectValues,
): CarSignInRedirectPath {
  const isAirportBooking = values.bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  const dropOffAddressValue = values.dropOffAddress?.trim() ?? "";

  const redirectParams = new URLSearchParams();
  redirectParams.set("bookingType", values.bookingType);

  if (values.fromDate) {
    redirectParams.set("from", dayjs(values.fromDate).format("YYYY-MM-DD"));
  }

  if (values.toDate) {
    redirectParams.set("to", dayjs(values.toDate).format("YYYY-MM-DD"));
  }

  if (values.pickupTime) {
    redirectParams.set("pickupTime", values.pickupTime);
  }

  if (values.flightNumber) {
    redirectParams.set("flightNumber", values.flightNumber);
  }

  if (values.pickupAddress.trim()) {
    redirectParams.set("pickupAddress", values.pickupAddress.trim());
  }

  const sameLocationRedirectValue =
    !isAirportBooking && values.sameLocation ? "true" : "false";
  redirectParams.set("sameLocation", sameLocationRedirectValue);

  if ((isAirportBooking || !values.sameLocation) && dropOffAddressValue) {
    redirectParams.set("dropOffAddress", dropOffAddressValue);
  }

  return `/(tabs)/login?redirectTo=/cars/${carId}?${redirectParams.toString()}`;
}
