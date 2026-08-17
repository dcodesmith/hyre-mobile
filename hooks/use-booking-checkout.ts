import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { randomUUID } from "expo-crypto";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type BookingCheckoutAttempt,
  getBookingCheckoutAttempt,
} from "@/lib/booking-checkout-attempt";
import type { BookingPricingPreviewResponse } from "@/lib/booking-pricing-preview-types";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
  NIGHT_PICKUP_TIME,
} from "@/lib/booking-types";
import { normalizeBookingTimeWindow } from "@/lib/booking-utils";
import {
  type PaymentSearchParams,
  shouldReconcileAfterBrowserClose,
} from "@/lib/payment-expiry-navigation";
import {
  recordBookingCheckoutStep,
  reportHandledException,
  reportUnexpectedState,
} from "@/lib/telemetry";
import {
  type BookingCheckoutDetailsValues,
  bookingCheckoutDetailsSchema,
  type GuestCheckoutFormValues,
} from "@/lib/validations/booking";
import {
  type CreateBookingCheckoutPayload,
  type CreateBookingCheckoutResponse,
  createBookingCheckout,
  getBookingPaymentErrorMessage,
  getBookingPriceChange,
  getBookingRetryAfterMs,
  isIdempotencyKeyReused,
} from "@/services/booking-payment";
import { savePaymentStatusToken } from "@/storage/payment-status-token";
import type { CarBookingFormValues } from "./use-car-booking-form";

type GuestPayload = Pick<
  CreateBookingCheckoutPayload,
  "guestName" | "guestEmail" | "guestPhone"
>;

type BuildPayloadArgs = {
  carId: string;
  booking: BookingCheckoutDetailsValues;
  callbackUrl: string;
  requiresFullTank: boolean;
  useCredits: number;
  expectedTotalAmount: string;
  guest: GuestPayload | null;
};

function buildCheckoutPayload(
  args: BuildPayloadArgs,
): CreateBookingCheckoutPayload {
  const {
    carId,
    booking,
    callbackUrl,
    requiresFullTank,
    useCredits,
    expectedTotalAmount,
  } = args;
  const isAirport = booking.bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  const sameLocation = isAirport ? false : booking.sameLocation;
  const pickupTime =
    booking.bookingType === NIGHT_BOOKING_TYPE
      ? NIGHT_PICKUP_TIME
      : booking.pickupTime;
  if (!pickupTime) {
    throw new Error("Pickup time is required to create a booking.");
  }
  const window = normalizeBookingTimeWindow({
    bookingType: booking.bookingType,
    startDate: booking.from as Date,
    endDate: booking.to as Date,
    pickupTime,
  });

  const payload: CreateBookingCheckoutPayload = {
    carId,
    bookingType: booking.bookingType,
    startDate: window.startDate.toISOString(),
    endDate: window.endDate.toISOString(),
    pickupAddress: booking.pickupAddress,
    sameLocation,
    pickupTime,
    includeSecurityDetail: false,
    requiresFullTank:
      booking.bookingType === DAY_BOOKING_TYPE ? requiresFullTank : false,
    expectedTotalAmount,
    callbackUrl,
  };

  if (!sameLocation) {
    payload.dropOffAddress = booking.dropOffAddress ?? "";
  }

  if (isAirport && booking.flightNumber) {
    payload.flightNumber = booking.flightNumber.toUpperCase();
  }

  if (args.guest) {
    payload.guestName = args.guest.guestName;
    payload.guestEmail = args.guest.guestEmail;
    payload.guestPhone = args.guest.guestPhone;
  }
  if (useCredits > 0) {
    payload.useCredits = useCredits;
  }

  return payload;
}

type PaymentCallback = {
  txRef: string;
  status: string | null;
  transactionId: string | null;
};

function parsePaymentCallback(url: string): PaymentCallback | null {
  const parsed = new URL(url);
  const txRef = parsed.searchParams.get("tx_ref");

  if (!txRef) {
    return null;
  }

  return {
    txRef,
    status: parsed.searchParams.get("status"),
    transactionId: parsed.searchParams.get("transaction_id"),
  };
}

function getBrowserFailureMessage(type: string): string {
  if (type === "cancel" || type === "dismiss") {
    return "Payment was cancelled before completion.";
  }
  return "We could not verify payment completion. Please check your booking status.";
}

async function createCheckoutWithRetry(
  payload: CreateBookingCheckoutPayload,
  isAuthenticated: boolean,
  idempotencyKey: string,
  isActive: () => boolean,
): Promise<CreateBookingCheckoutResponse | null> {
  try {
    return await createBookingCheckout(
      payload,
      isAuthenticated,
      idempotencyKey,
    );
  } catch (error) {
    const retryAfterMs = getBookingRetryAfterMs(error);
    if (retryAfterMs === null) throw error;

    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    if (!isActive()) return null;

    return createBookingCheckout(payload, isAuthenticated, idempotencyKey);
  }
}

async function persistPaymentStatusToken(
  checkout: CreateBookingCheckoutResponse,
  isAuthenticated: boolean,
): Promise<void> {
  if (!checkout.paymentStatusToken) {
    if (!isAuthenticated) {
      throw new Error(
        "Payment verification credentials are missing. Please try again.",
      );
    }
    return;
  }
  await savePaymentStatusToken(checkout.bookingId, checkout.paymentStatusToken);
}

function handleBookingPriceChange(
  error: unknown,
  onPriceChanged: (pricing: BookingPricingPreviewResponse) => void,
) {
  const currentPricing = getBookingPriceChange(error);
  if (currentPricing) onPriceChanged(currentPricing);
}

export type UseBookingCheckoutArgs = {
  carId: string;
  isAuthenticated: boolean;
  requiresFullTank: boolean;
  useCredits: number;
  authoritativeTotal: number | null;
  validate: () => Promise<boolean>;
  getBookingValues: () => CarBookingFormValues;
  getGuestValues: () => GuestCheckoutFormValues;
  onPriceChanged: (pricing: BookingPricingPreviewResponse) => void;
};

export type UseBookingCheckoutReturn = {
  submit: () => Promise<void>;
  isSubmitting: boolean;
  paymentError: string | null;
};

/**
 * Owns the booking submission pipeline: validate the forms, build the API
 * payload, open the payment checkout in a web auth session, then route to the
 * payment-status screen. `paymentError` is reserved for non-validation
 * failures (field-level errors are surfaced inline by RHF).
 */
export function useBookingCheckout(
  args: UseBookingCheckoutArgs,
): UseBookingCheckoutReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const checkoutAttempt = useRef<BookingCheckoutAttempt | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const {
    carId,
    isAuthenticated,
    requiresFullTank,
    useCredits,
    authoritativeTotal,
    validate,
    getBookingValues,
    getGuestValues,
    onPriceChanged,
  } = args;

  const navigateToPaymentStatus = useCallback(
    (
      checkout: CreateBookingCheckoutResponse,
      callback: PaymentCallback,
      searchParams: PaymentSearchParams,
    ) => {
      router.push({
        pathname: "/payment-status" as never,
        params: {
          ...searchParams,
          tx_ref: callback.txRef,
          transactionType: "booking_creation",
          bookingId: checkout.bookingId,
          ...(callback.status ? { status: callback.status } : {}),
          ...(callback.transactionId
            ? { transaction_id: callback.transactionId }
            : {}),
        },
      } as never);
    },
    [router],
  );

  const submit = useCallback(async () => {
    if (authoritativeTotal === null) {
      setPaymentError("Wait for the booking price to finish loading.");
      return;
    }
    if (!(await validate()) || !isMounted.current) return;

    setIsSubmitting(true);
    setPaymentError(null);

    try {
      const booking = bookingCheckoutDetailsSchema.parse(getBookingValues());
      // Defensive: `validate` above guarantees dates are present.
      if (!booking.from || !booking.to) return;

      const callbackUrl = Linking.createURL("/payment-status", {
        queryParams: { transactionType: "booking_creation" },
      });
      const guestValues = getGuestValues();
      const guestEmail = guestValues.email.trim().toLowerCase();
      const guestPayload: GuestPayload | null = isAuthenticated
        ? null
        : {
            guestName: guestValues.name.trim(),
            guestEmail,
            guestPhone: guestValues.phoneNumber.trim(),
          };

      const payload = buildCheckoutPayload({
        carId,
        booking,
        callbackUrl,
        requiresFullTank,
        useCredits,
        expectedTotalAmount: authoritativeTotal.toFixed(2),
        guest: guestPayload,
      });
      const searchParams: PaymentSearchParams = {
        bookingType: booking.bookingType,
        from: dayjs(booking.from).format("YYYY-MM-DD"),
        to: dayjs(booking.to).format("YYYY-MM-DD"),
        pickupTime: payload.pickupTime,
        ...(booking.flightNumber
          ? { flightNumber: booking.flightNumber }
          : {}),
      };

      const attempt = getBookingCheckoutAttempt(
        checkoutAttempt.current,
        payload,
        randomUUID,
      );
      checkoutAttempt.current = attempt;

      const checkoutMode = isAuthenticated ? "authenticated" : "guest";
      recordBookingCheckoutStep("create_booking", "started", {
        checkout_mode: checkoutMode,
      });
      let checkout: CreateBookingCheckoutResponse | null;
      try {
        checkout = await createCheckoutWithRetry(
          payload,
          isAuthenticated,
          attempt.idempotencyKey,
          () => isMounted.current,
        );
        recordBookingCheckoutStep(
          "create_booking",
          checkout ? "succeeded" : "cancelled",
          { checkout_mode: checkoutMode },
        );
      } catch (error) {
        recordBookingCheckoutStep("create_booking", "failed", {
          checkout_mode: checkoutMode,
        });
        throw error;
      }
      if (!checkout || !isMounted.current) return;
      void queryClient.invalidateQueries({
        queryKey: ["referrals", "summary"],
      });
      await persistPaymentStatusToken(checkout, isAuthenticated);
      recordBookingCheckoutStep("open_flutterwave_checkout", "started", {
        checkout_mode: checkoutMode,
      });
      let browserResult: WebBrowser.WebBrowserAuthSessionResult;
      try {
        browserResult = await WebBrowser.openAuthSessionAsync(
          checkout.checkoutUrl,
          callbackUrl,
        );
      } catch (error) {
        recordBookingCheckoutStep("open_flutterwave_checkout", "failed", {
          checkout_mode: checkoutMode,
        });
        throw error;
      }
      const browserState =
        browserResult.type === "success"
          ? "succeeded"
          : browserResult.type === "cancel" ||
              browserResult.type === "dismiss"
            ? "cancelled"
            : "failed";
      recordBookingCheckoutStep("open_flutterwave_checkout", browserState, {
        checkout_mode: checkoutMode,
        result_type: browserResult.type,
      });

      if (!isMounted.current) return;
      if (browserResult.type !== "success" || !browserResult.url) {
        if (
          shouldReconcileAfterBrowserClose(
            browserResult.type,
            checkout.reservationExpiresAt,
          )
        ) {
          navigateToPaymentStatus(
            checkout,
            {
              txRef: checkout.txRef,
              status: "expired",
              transactionId: null,
            },
            searchParams,
          );
          return;
        }
        if (
          browserResult.type !== "cancel" &&
          browserResult.type !== "dismiss"
        ) {
          reportUnexpectedState("Flutterwave checkout did not complete", {
            area: "booking_checkout",
            operation: "open_flutterwave_checkout",
          });
        }
        setPaymentError(getBrowserFailureMessage(browserResult.type));
        return;
      }

      const callback = parsePaymentCallback(browserResult.url);
      if (!callback) {
        reportUnexpectedState("Payment callback was missing transaction details", {
          area: "booking_checkout",
          operation: "parse_payment_callback",
        });
        setPaymentError(
          "Payment returned without a transaction reference. Please contact support if you were charged.",
        );
        return;
      }

      navigateToPaymentStatus(checkout, callback, searchParams);
    } catch (error) {
      reportHandledException(error, {
        area: "booking_checkout",
        operation: "submit",
      });
      if (!isMounted.current) return;
      handleBookingPriceChange(error, onPriceChanged);
      if (isIdempotencyKeyReused(error)) {
        checkoutAttempt.current = null;
      }
      setPaymentError(getBookingPaymentErrorMessage(error));
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }, [
    validate,
    carId,
    isAuthenticated,
    requiresFullTank,
    useCredits,
    authoritativeTotal,
    getBookingValues,
    getGuestValues,
    navigateToPaymentStatus,
    onPriceChanged,
    queryClient,
  ]);

  return { submit, isSubmitting, paymentError };
}
