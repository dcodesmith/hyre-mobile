import dayjs from "dayjs";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
} from "./booking-types";

export type CarSignInRedirectValues = {
  searchId?: string | null;
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
  `/(tabs)/login?redirectTo=${string}`;
export type BookingSignInRedirectPath =
  `/(tabs)/login?redirectTo=${string}`;

function firstSearchParam(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
    return value[0];
  }
  return null;
}

/**
 * Builds the login path that preserves the in-progress car booking across
 * sign-in. The destination is URI-encoded so nested query params survive.
 */
export function buildCarSignInRedirectPath(
  carId: string,
  values: CarSignInRedirectValues,
): CarSignInRedirectPath {
  const isAirportBooking = values.bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  const dropOffAddressValue = values.dropOffAddress?.trim() ?? "";

  const redirectParams = new URLSearchParams();
  if (values.searchId) {
    redirectParams.set("searchId", values.searchId);
  }
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

  const destination = `/cars/${carId}?${redirectParams.toString()}`;
  return `/(tabs)/login?redirectTo=${encodeURIComponent(destination)}`;
}

export function buildBookingSignInRedirectPath(
  bookingId: string,
): BookingSignInRedirectPath {
  const destination = `/bookings/${encodeURIComponent(bookingId)}`;
  return `/(tabs)/login?redirectTo=${encodeURIComponent(destination)}`;
}

/**
 * Only allow returning to supported in-app detail routes. Anything else falls
 * back to home so login cannot be used as an open redirect.
 */
export function resolvePostLoginHref(
  redirectTo: unknown,
): "/" | `/cars/${string}` | `/bookings/${string}` {
  const raw = firstSearchParam(redirectTo);
  if (!raw) return "/";

  try {
    // Search params are already decoded by Expo Router. Decode only when this
    // helper receives the fully encoded value produced by the path builder.
    const value = raw.startsWith("/") ? raw : decodeURIComponent(raw);
    const pathname = value.split(/[?#]/, 1)[0];
    const [root, route, encodedId, ...extraSegments] = pathname.split("/");
    const id = decodeURIComponent(encodedId ?? "");

    if (
      root !== "" ||
      (route !== "cars" && route !== "bookings") ||
      extraSegments.length > 0 ||
      !id ||
      id === "." ||
      id === ".." ||
      id.includes("/") ||
      id.includes("\\")
    ) {
      return "/";
    }

    return value as `/cars/${string}` | `/bookings/${string}`;
  } catch {
    return "/";
  }
}

export function pickRedirectToParam(redirectTo: unknown): string | undefined {
  return firstSearchParam(redirectTo) ?? undefined;
}
