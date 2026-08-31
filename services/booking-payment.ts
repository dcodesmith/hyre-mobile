import {
  ApiError,
  getJson,
  getJsonWithAuth,
  postJson,
  postJsonWithAuth,
} from "@/lib/api-client";
import type { BookingPricingPreviewResponse } from "@/lib/booking-pricing-preview-types";

const BOOKINGS_ENDPOINT = "/api/bookings";

export type CreateBookingCheckoutPayload = {
  carId: string;
  startDate: string;
  endDate: string;
  pickupAddress: string;
  bookingType: "DAY" | "NIGHT" | "FULL_DAY" | "AIRPORT_PICKUP";
  sameLocation: boolean;
  dropOffAddress?: string;
  pickupTime: string;
  flightNumber?: string;
  includeSecurityDetail?: boolean;
  requiresFullTank?: boolean;
  specialRequests?: string;
  useCredits?: number;
  expectedTotalAmount: string;
  callbackUrl?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
};

export type CreateBookingCheckoutResponse = {
  bookingId: string;
  txRef: string;
  checkoutUrl: string;
  totalAmount: number;
  currency: "NGN";
  bookingStatus: string;
  reservationExpiresAt: string;
  paymentStatusToken?: string;
};

export type BookingPaymentLifecycleState =
  | "PENDING"
  | "VERIFYING"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED";

export type BookingPaymentStatusResponse = {
  bookingId: string;
  bookingReference: string;
  txRef: string;
  bookingStatus: string;
  paymentStatus: string;
  paymentId: string | null;
  totalAmount: number;
  reservationExpiresAt: string | null;
  lifecycleState: BookingPaymentLifecycleState;
};

export type ExtensionPaymentStatusResponse = {
  txRef: string;
  status: string;
  amountExpected: number;
  amountCharged: number | null;
  confirmedAt: string | null;
  extension: {
    id: string;
    status: string;
  };
};

type BookingPaymentStatusRequest = {
  txRef: string;
  bookingId: string;
  isAuthenticated: boolean;
  paymentStatusToken?: string;
};

type ConfirmBookingPaymentRequest = BookingPaymentStatusRequest & {
  transactionId: string;
};

type ConfirmExtensionPaymentRequest = {
  extensionId: string;
  txRef: string;
  transactionId: string;
};

function withPaymentStatusToken(
  init: RequestInit | undefined,
  paymentStatusToken: string | undefined,
): RequestInit {
  const headers = new Headers(init?.headers);
  if (paymentStatusToken) {
    headers.set("X-Payment-Status-Token", paymentStatusToken);
    return { ...init, credentials: "omit", headers };
  }
  return { ...init, headers };
}

export async function createBookingCheckout(
  payload: CreateBookingCheckoutPayload,
  isAuthenticated: boolean,
  idempotencyKey: string,
): Promise<CreateBookingCheckoutResponse> {
  const init = { headers: { "Idempotency-Key": idempotencyKey } };

  if (isAuthenticated) {
    return postJsonWithAuth<
      CreateBookingCheckoutResponse,
      CreateBookingCheckoutPayload
    >(BOOKINGS_ENDPOINT, payload, init);
  }

  return postJson<CreateBookingCheckoutResponse, CreateBookingCheckoutPayload>(
    BOOKINGS_ENDPOINT,
    payload,
    init,
  );
}

type BookingErrorDetails = {
  currentPricing?: BookingPricingPreviewResponse;
  retryAfterSeconds?: number;
};

function getBookingErrorDetails(error: ApiError): BookingErrorDetails | null {
  if (typeof error.data !== "object" || error.data === null) return null;
  const details = (error.data as { details?: unknown }).details;
  return typeof details === "object" && details !== null
    ? (details as BookingErrorDetails)
    : null;
}

export function getBookingPriceChange(
  error: unknown,
): BookingPricingPreviewResponse | null {
  if (!(error instanceof ApiError) || error.code !== "BOOKING_PRICE_CHANGED") {
    return null;
  }
  return getBookingErrorDetails(error)?.currentPricing ?? null;
}

export function getBookingRetryAfterMs(error: unknown): number | null {
  if (
    !(error instanceof ApiError) ||
    error.code !== "BOOKING_REQUEST_IN_PROGRESS"
  ) {
    return null;
  }
  const seconds = getBookingErrorDetails(error)?.retryAfterSeconds;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : 5000;
}

export function isIdempotencyKeyReused(error: unknown): boolean {
  return error instanceof ApiError && error.code === "IDEMPOTENCY_KEY_REUSED";
}

export async function fetchBookingPaymentStatus(
  request: BookingPaymentStatusRequest,
  init?: RequestInit,
): Promise<BookingPaymentStatusResponse> {
  const { txRef, bookingId, isAuthenticated, paymentStatusToken } = request;
  const searchParams = new URLSearchParams({ txRef, bookingId });

  if (!isAuthenticated && !paymentStatusToken) {
    throw new Error("Payment status token is required.");
  }

  const path = `${BOOKINGS_ENDPOINT}/payment-status?${searchParams.toString()}`;
  if (isAuthenticated) {
    return getJsonWithAuth<BookingPaymentStatusResponse>(path, init);
  }

  return getJson<BookingPaymentStatusResponse>(
    path,
    withPaymentStatusToken(init, paymentStatusToken),
  );
}

export async function confirmBookingPayment(
  request: ConfirmBookingPaymentRequest,
  init?: RequestInit,
): Promise<BookingPaymentStatusResponse> {
  const {
    txRef,
    bookingId,
    transactionId,
    isAuthenticated,
    paymentStatusToken,
  } = request;
  if (!isAuthenticated && !paymentStatusToken) {
    throw new Error("Payment status token is required.");
  }
  const body = { txRef, bookingId, transactionId };
  const path = "/api/payments/booking-confirmation";

  return isAuthenticated
    ? postJsonWithAuth<BookingPaymentStatusResponse, typeof body>(
        path,
        body,
        init,
      )
    : postJson<BookingPaymentStatusResponse, typeof body>(
        path,
        body,
        withPaymentStatusToken(init, paymentStatusToken),
      );
}

export async function fetchExtensionPaymentStatus(
  txRef: string,
  init?: RequestInit,
): Promise<ExtensionPaymentStatusResponse> {
  return getJsonWithAuth<ExtensionPaymentStatusResponse>(
    `/api/payments/status/${encodeURIComponent(txRef)}`,
    init,
  );
}

export async function confirmExtensionPayment(
  request: ConfirmExtensionPaymentRequest,
  init?: RequestInit,
): Promise<ExtensionPaymentStatusResponse> {
  return postJsonWithAuth<
    ExtensionPaymentStatusResponse,
    ConfirmExtensionPaymentRequest
  >("/api/payments/extension-confirmation", request, init);
}

export async function reconcileBookingExpiration(
  request: BookingPaymentStatusRequest,
  init?: RequestInit,
): Promise<BookingPaymentStatusResponse> {
  const { txRef, bookingId, isAuthenticated, paymentStatusToken } = request;
  if (!isAuthenticated && !paymentStatusToken) {
    throw new Error("Payment status token is required.");
  }
  const body = { bookingId, txRef };
  const path = "/api/payments/booking-expiration";

  return isAuthenticated
    ? postJsonWithAuth<BookingPaymentStatusResponse, typeof body>(
        path,
        body,
        init,
      )
    : postJson<BookingPaymentStatusResponse, typeof body>(
        path,
        body,
        withPaymentStatusToken(init, paymentStatusToken),
      );
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
