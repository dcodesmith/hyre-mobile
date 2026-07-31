import {
  ApiError,
  getJson,
  getJsonWithAuth,
  postJson,
  postJsonWithAuth,
} from "@/lib/api-client";

const BOOKINGS_ENDPOINT = "/api/bookings";

export type CreateBookingCheckoutPayload = {
  carId: string;
  startDate: string;
  endDate: string;
  pickupAddress: string;
  bookingType: "DAY" | "NIGHT" | "FULL_DAY" | "AIRPORT_PICKUP";
  sameLocation: boolean;
  dropOffAddress?: string;
  pickupTime?: string;
  flightNumber?: string;
  includeSecurityDetail?: boolean;
  requiresFullTank?: boolean;
  specialRequests?: string;
  useCredits?: number;
  clientTotalAmount?: string;
  callbackUrl?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
};

export type CreateBookingCheckoutResponse = {
  bookingId: string;
  checkoutUrl: string;
};

export type BookingPaymentStatusResponse = {
  bookingId: string;
  bookingReference: string;
  txRef: string;
  bookingStatus: string;
  paymentStatus: string;
  paymentId: string | null;
  totalAmount: number;
  isConfirmed: boolean;
};

type BookingPaymentStatusRequest = {
  txRef: string;
  bookingId: string;
  isAuthenticated: boolean;
  guestEmail?: string;
};

export async function createBookingCheckout(
  payload: CreateBookingCheckoutPayload,
  isAuthenticated: boolean,
): Promise<CreateBookingCheckoutResponse> {
  if (isAuthenticated) {
    return postJsonWithAuth<
      CreateBookingCheckoutResponse,
      CreateBookingCheckoutPayload
    >(BOOKINGS_ENDPOINT, payload);
  }

  return postJson<CreateBookingCheckoutResponse, CreateBookingCheckoutPayload>(
    BOOKINGS_ENDPOINT,
    payload,
  );
}

export async function fetchBookingPaymentStatus(
  request: BookingPaymentStatusRequest,
  init?: RequestInit,
): Promise<BookingPaymentStatusResponse> {
  const { txRef, bookingId, isAuthenticated, guestEmail } = request;
  const searchParams = new URLSearchParams({ txRef, bookingId });

  if (!isAuthenticated) {
    if (!guestEmail) {
      throw new Error("Guest email is required to verify payment status.");
    }

    searchParams.set("guestEmail", guestEmail);
  }

  const path = `${BOOKINGS_ENDPOINT}/payment-status?${searchParams.toString()}`;
  if (isAuthenticated) {
    return getJsonWithAuth<BookingPaymentStatusResponse>(path, init);
  }

  return getJson<BookingPaymentStatusResponse>(path, init);
}

export function getBookingPaymentErrorMessage(
  error: unknown,
  fallback = "Unable to process booking payment right now. Please try again.",
): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
