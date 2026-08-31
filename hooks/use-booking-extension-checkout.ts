import { ApiError } from "@/lib/api-client";
import {
  type BookingCheckoutAttempt,
  getBookingCheckoutAttempt,
} from "@/lib/booking-checkout-attempt";
import { parsePaymentCallback } from "@/lib/payment-callback";
import { reportHandledException } from "@/lib/telemetry";
import {
  type BookingDetail,
  type BookingLeg,
  createBookingExtension,
  getBookingActionErrorMessage,
} from "@/services/bookings";
import { saveExtensionPaymentSession } from "@/storage/extension-payment-session";
import { randomUUID } from "expo-crypto";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";

const RESTART_EXTENSION_ERROR_CODES = new Set([
  "EXTENSION_IDEMPOTENCY_KEY_REUSED",
  "EXTENSION_PAYMENT_SESSION_EXPIRED",
  "EXTENSION_STATE_CHANGED",
]);

type UseBookingExtensionCheckoutOptions = {
  booking: BookingDetail;
  selectedLeg: BookingLeg;
  selectedHours: number;
  userId: string;
  refreshBooking: () => Promise<unknown>;
};

export function useBookingExtensionCheckout({
  booking,
  selectedLeg,
  selectedHours,
  userId,
  refreshBooking,
}: UseBookingExtensionCheckoutOptions) {
  const router = useRouter();
  const attemptRef = useRef<BookingCheckoutAttempt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const callbackUrl = Linking.createURL("/extension-payment-status");
    const payload = {
      bookingLegId: selectedLeg.id,
      hours: selectedHours,
      callbackUrl,
    };
    const attempt = getBookingCheckoutAttempt(
      attemptRef.current,
      payload,
      randomUUID,
    );
    attemptRef.current = attempt;

    try {
      const checkout = await createBookingExtension(
        booking.id,
        payload,
        attempt.idempotencyKey,
      );
      await saveExtensionPaymentSession({
        userId,
        bookingId: booking.id,
        extensionId: checkout.extensionId,
        txRef: checkout.paymentIntentId,
      });
      const browserResult = await WebBrowser.openAuthSessionAsync(
        checkout.checkoutUrl,
        callbackUrl,
      );

      if (browserResult.type !== "success" || !browserResult.url) {
        setErrorMessage("Payment was cancelled before completion.");
      } else {
        const callback = parsePaymentCallback(browserResult.url);
        router.replace({
          pathname: "/extension-payment-status",
          params: {
            bookingId: booking.id,
            extensionId: checkout.extensionId,
            tx_ref: checkout.paymentIntentId,
            ...(callback?.transactionId
              ? { transaction_id: callback.transactionId }
              : {}),
          },
        } as never);
      }
    } catch (error) {
      reportHandledException(error, {
        area: "booking_extension",
        operation: "create_and_open_checkout",
      });
      if (
        error instanceof ApiError &&
        error.code === "EXTENSION_ALREADY_CONFIRMED"
      ) {
        router.replace(`/bookings/${booking.id}` as never);
      } else {
        if (
          error instanceof ApiError &&
          error.code &&
          RESTART_EXTENSION_ERROR_CODES.has(error.code)
        ) {
          attemptRef.current = null;
          await refreshBooking().catch(() => undefined);
        }
        setErrorMessage(
          getBookingActionErrorMessage(
            error,
            "Unable to reserve this extension. Please try again.",
          ),
        );
      }
    }

    setIsSubmitting(false);
  };

  return { errorMessage, isSubmitting, submit };
}
