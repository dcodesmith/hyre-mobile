import { ApiError, getJson, postJson } from "@/lib/api-client";
import type { BookingAddonSnapshot } from "@/lib/booking-addons";
import type { BookingType } from "@/lib/booking-types";
import type { BookingStatus } from "@/services/bookings";

const GUEST_ACCESS_ENDPOINT = "/api/bookings/guest-access";

export type GuestBookingAccessRequest = {
  bookingReference: string;
  email: string;
};

export type GuestBookingAccessResponse = {
  message: string;
};

export type GuestBookingDetailsResponse = {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  paymentStatus: string;
  bookingType: BookingType;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  specialRequests: string | null;
  cancellationReason: string | null;
  flightNumber: string | null;
  totalAmount: number;
  currency: "NGN";
  accessExpiresAt: string;
  addons: BookingAddonSnapshot[];
  car: {
    make: string;
    model: string;
    year: number;
    images: string[];
  };
  chauffeur: {
    name: string | null;
    phoneNumber: string | null;
  } | null;
  legs: Array<{
    id: string;
    legDate: string;
    legStartTime: string;
    legEndTime: string;
    extensions: Array<{
      id: string;
      extensionStartTime: string;
      extensionEndTime: string;
      extendedDurationHours: number;
      status: string;
      paymentStatus: string;
    }>;
  }>;
};

export const requestGuestBookingAccess = (
  payload: GuestBookingAccessRequest,
) =>
  postJson<GuestBookingAccessResponse, GuestBookingAccessRequest>(
    GUEST_ACCESS_ENDPOINT,
    payload,
    { credentials: "omit" },
  );

export const fetchGuestBooking = (token: string, init?: RequestInit) =>
  getJson<GuestBookingDetailsResponse>(
    `${GUEST_ACCESS_ENDPOINT}?token=${encodeURIComponent(token)}`,
    { ...init, credentials: "omit" },
  );

export const getGuestBookingRequestErrorMessage = (error: unknown) =>
  error instanceof ApiError && error.status === 429
    ? "Too many access requests. Please wait before trying again."
    : "We couldn’t send an access link right now. Please try again.";

export const isInvalidGuestBookingAccessError = (error: unknown) =>
  error instanceof ApiError && (error.status === 400 || error.status === 404);
