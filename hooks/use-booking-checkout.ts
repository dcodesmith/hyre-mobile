import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  DAY_BOOKING_TYPE,
} from "@/lib/booking-types";
import { normalizeBookingTimeWindow } from "@/lib/booking-utils";
import {
  type BookingCheckoutDetailsValues,
  type GuestCheckoutFormValues,
  bookingCheckoutDetailsSchema,
} from "@/lib/validations/booking";
import {
  type CreateBookingCheckoutPayload,
  type CreateBookingCheckoutResponse,
  createBookingCheckout,
  getBookingPaymentErrorMessage,
} from "@/services/booking-payment";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
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
  clientTotalAmount: string;
  guest: GuestPayload | null;
};

function buildCheckoutPayload(
  args: BuildPayloadArgs,
): CreateBookingCheckoutPayload {
  const { carId, booking, callbackUrl, requiresFullTank, clientTotalAmount } =
    args;
  const isAirport = booking.bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  const sameLocation = isAirport ? false : booking.sameLocation;
  const window = normalizeBookingTimeWindow({
    bookingType: booking.bookingType,
    startDate: booking.from as Date,
    endDate: booking.to as Date,
    pickupTime: booking.pickupTime,
  });

  const payload: CreateBookingCheckoutPayload = {
    carId,
    bookingType: booking.bookingType,
    startDate: window.startDate.toISOString(),
    endDate: window.endDate.toISOString(),
    pickupAddress: booking.pickupAddress,
    sameLocation,
    includeSecurityDetail: false,
    requiresFullTank:
      booking.bookingType === DAY_BOOKING_TYPE ? requiresFullTank : false,
    clientTotalAmount,
    callbackUrl,
  };

  if (!sameLocation) {
    payload.dropOffAddress = booking.dropOffAddress ?? "";
  }

  if (booking.pickupTime) {
    payload.pickupTime = booking.pickupTime;
  }

  if (isAirport && booking.flightNumber) {
    payload.flightNumber = booking.flightNumber.toUpperCase();
  }

  if (args.guest) {
    payload.guestName = args.guest.guestName;
    payload.guestEmail = args.guest.guestEmail;
    payload.guestPhone = args.guest.guestPhone;
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

export type UseBookingCheckoutArgs = {
  carId: string;
  isAuthenticated: boolean;
  requiresFullTank: boolean;
  finalTotal: number;
  validate: () => Promise<boolean>;
  getBookingValues: () => CarBookingFormValues;
  getGuestValues: () => GuestCheckoutFormValues;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const {
    carId,
    isAuthenticated,
    requiresFullTank,
    finalTotal,
    validate,
    getBookingValues,
    getGuestValues,
  } = args;

  const navigateToPaymentStatus = useCallback(
    (
      checkout: CreateBookingCheckoutResponse,
      callback: PaymentCallback,
      guestEmail: string,
    ) => {
      router.push({
        pathname: "/payment-status" as never,
        params: {
          tx_ref: callback.txRef,
          transactionType: "booking_creation",
          bookingId: checkout.bookingId,
          ...(callback.status ? { status: callback.status } : {}),
          ...(callback.transactionId
            ? { transaction_id: callback.transactionId }
            : {}),
          ...(isAuthenticated ? {} : { guestEmail }),
        },
      } as never);
    },
    [router, isAuthenticated],
  );

  const submit = useCallback(async () => {
    if (!(await validate())) return;

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
        clientTotalAmount: finalTotal.toFixed(2),
        guest: guestPayload,
      });

      const checkout = await createBookingCheckout(payload, isAuthenticated);
      const browserResult = await WebBrowser.openAuthSessionAsync(
        checkout.checkoutUrl,
        callbackUrl,
      );

      if (browserResult.type !== "success" || !browserResult.url) {
        setPaymentError(getBrowserFailureMessage(browserResult.type));
        return;
      }

      const callback = parsePaymentCallback(browserResult.url);
      if (!callback) {
        setPaymentError(
          "Payment returned without a transaction reference. Please contact support if you were charged.",
        );
        return;
      }

      navigateToPaymentStatus(checkout, callback, guestEmail);
    } catch (error) {
      setPaymentError(getBookingPaymentErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validate,
    carId,
    isAuthenticated,
    requiresFullTank,
    finalTotal,
    getBookingValues,
    getGuestValues,
    navigateToPaymentStatus,
  ]);

  return { submit, isSubmitting, paymentError };
}
