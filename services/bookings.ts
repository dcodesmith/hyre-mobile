import {
  ApiError,
  getJsonWithAuth,
  patchJsonWithAuth,
  postJsonWithAuth,
} from "@/lib/api-client";
import type { BookingAddonSnapshot } from "@/lib/booking-addons";
import type { BookingType } from "@/lib/booking-types";

const BOOKINGS_ENDPOINT = "/api/bookings";

export const BOOKING_STATUSES = [
  "ACTIVE",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type BookingStatus =
  | (typeof BOOKING_STATUSES)[number]
  | "PENDING"
  | "REJECTED";

export type BookingCarImage = {
  id?: string;
  url: string;
};

export type BookingCarSummary = {
  id: string;
  make: string;
  model: string;
  year: number;
  images: BookingCarImage[];
};

export type BookingSummary = {
  id: string;
  bookingReference: string;
  status: BookingStatus;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  canEdit: boolean;
  canCancel: boolean;
  modificationCutoffAt: string;
  type: BookingType;
  totalAmount: number;
  pickupLocation: string;
  returnLocation: string;
  car: BookingCarSummary;
  review?: unknown;
};

export type BookingsByStatusResponse = Partial<
  Record<BookingStatus, BookingSummary[]>
>;

export type BookingLeg = {
  id: string;
  legDate: string;
  legStartTime: string;
  legEndTime: string;
  totalDailyPrice?: number;
  extensions: Array<{
    id: string;
    status: string;
    paymentStatus: string;
    extendedDurationHours: number;
    netTotal?: number | null;
  }>;
  canExtend: boolean;
  maxExtendableHours: number;
};

export type BookingDetail = Omit<BookingSummary, "car"> & {
  car: Omit<BookingCarSummary, "id"> & { id?: string };
  paymentId?: string | null;
  platformCustomerServiceFeeAmount?: number | null;
  platformCustomerServiceFeeRatePercent?: number | null;
  vatAmount?: number | null;
  vatRatePercent?: number | null;
  addons?: BookingAddonSnapshot[];
  fuelUpgradeCost?: number | null;
  referralDiscountAmount?: number | null;
  referralCreditsUsed?: number | null;
  referralCreditsReserved?: number | null;
  netTotal?: number | null;
  chauffeur?: {
    id?: string;
    name?: string | null;
    phoneNumber?: string | null;
    image?: string | null;
  } | null;
  flight?: {
    id?: string;
    flightNumber?: string | null;
    flightDate?: string | null;
    status?: string | null;
    originName?: string | null;
    originCode?: string | null;
    originCodeIATA?: string | null;
    originCity?: string | null;
    destinationName?: string | null;
    destinationCode?: string | null;
    destinationCodeIATA?: string | null;
    destinationCity?: string | null;
    scheduledArrival?: string | null;
    estimatedArrival?: string | null;
    actualArrival?: string | null;
    delayMinutes?: number | null;
    aircraftType?: string | null;
    registration?: string | null;
  } | null;
  legs: BookingLeg[];
};

export type UpdateBookingPayload = {
  pickupTime?: string;
  pickupAddress?: string;
  sameLocation?: boolean;
  dropOffAddress?: string;
};

export type CreateBookingExtensionPayload = {
  bookingLegId: string;
  hours: number;
  callbackUrl: string;
};

export type CreateBookingExtensionResponse = {
  extensionId: string;
  paymentIntentId: string;
  checkoutUrl: string;
};

type CancelBookingPayload = {
  reason?: string;
};

export async function fetchBookingsByStatus(
  init?: RequestInit,
): Promise<BookingsByStatusResponse> {
  return getJsonWithAuth<BookingsByStatusResponse>(BOOKINGS_ENDPOINT, init);
}

export async function fetchBookingById(
  bookingId: string,
  init?: RequestInit,
): Promise<BookingDetail> {
  return getJsonWithAuth<BookingDetail>(
    `${BOOKINGS_ENDPOINT}/${bookingId}`,
    init,
  );
}

export async function updateBooking(
  bookingId: string,
  payload: UpdateBookingPayload,
): Promise<BookingDetail> {
  return patchJsonWithAuth<BookingDetail, UpdateBookingPayload>(
    `${BOOKINGS_ENDPOINT}/${encodeURIComponent(bookingId)}`,
    payload,
  );
}

export async function cancelBooking(
  bookingId: string,
  reason = "User requested cancellation",
): Promise<BookingDetail> {
  return patchJsonWithAuth<BookingDetail, CancelBookingPayload>(
    `${BOOKINGS_ENDPOINT}/${encodeURIComponent(bookingId)}/cancel`,
    { reason },
  );
}

export async function createBookingExtension(
  bookingId: string,
  payload: CreateBookingExtensionPayload,
  idempotencyKey: string,
): Promise<CreateBookingExtensionResponse> {
  return postJsonWithAuth<
    CreateBookingExtensionResponse,
    CreateBookingExtensionPayload
  >(
    `${BOOKINGS_ENDPOINT}/${encodeURIComponent(bookingId)}/extensions`,
    payload,
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
}

export const getBookingActionErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
