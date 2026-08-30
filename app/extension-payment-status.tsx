import { PaymentStatusMessage } from "@/components/payment-status-message";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";
import { getExtensionPaymentLifecycleState } from "@/lib/extension-payment-status";
import { formatCurrency } from "@/lib/currency";
import { getPaymentStatusPollingInterval } from "@/lib/payment-status-polling";
import { reportHandledException } from "@/lib/telemetry";
import {
  type ExtensionPaymentStatusResponse,
  confirmExtensionPayment,
  fetchExtensionPaymentStatus,
  getBookingPaymentErrorMessage,
} from "@/services/booking-payment";
import {
  deleteExtensionPaymentSession,
  getExtensionPaymentSession,
  type ExtensionPaymentSession,
} from "@/storage/extension-payment-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

const POLLING_BUDGET_MS = 90_000;
const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function ExtensionPaymentStatusScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrating } = useAuth();
  const params = useLocalSearchParams<{
    bookingId?: string;
    extensionId?: string;
    tx_ref?: string;
    transaction_id?: string;
  }>();
  const routeBookingId = readParam(params.bookingId);
  const routeExtensionId = readParam(params.extensionId);
  const routeTxRef = readParam(params.tx_ref);
  const transactionId = readParam(params.transaction_id);
  const confirmationAttemptedFor = useRef<string | null>(null);
  const [pollingBudgetExpired, setPollingBudgetExpired] = useState(false);
  const [storedSession, setStoredSession] =
    useState<ExtensionPaymentSession | null>(null);
  const [isSessionHydrating, setIsSessionHydrating] = useState(true);
  const hasRouteSession = Boolean(
    routeBookingId && routeExtensionId && routeTxRef,
  );
  const session = hasRouteSession
    ? {
        bookingId: routeBookingId ?? "",
        extensionId: routeExtensionId ?? "",
        txRef: routeTxRef ?? "",
      }
    : storedSession && (!routeTxRef || storedSession.txRef === routeTxRef)
      ? storedSession
      : null;
  const bookingId = session?.bookingId;
  const extensionId = session?.extensionId;
  const txRef = session?.txRef;
  const canVerify =
    !isHydrating &&
    !isSessionHydrating &&
    isAuthenticated &&
    Boolean(bookingId && extensionId && txRef);
  const confirmationKey =
    txRef && transactionId ? `${txRef}:${transactionId}` : null;

  useEffect(() => {
    let active = true;
    if (routeBookingId && routeExtensionId && routeTxRef) {
      setStoredSession(null);
      setIsSessionHydrating(false);
      return;
    }

    setIsSessionHydrating(true);
    void getExtensionPaymentSession()
      .then((paymentSession) => {
        if (active) setStoredSession(paymentSession);
      })
      .catch((error) => {
        reportHandledException(error, {
          area: "booking_extension",
          operation: "hydrate_payment_session",
        });
        if (active) setStoredSession(null);
      })
      .finally(() => {
        if (active) setIsSessionHydrating(false);
      });

    return () => {
      active = false;
    };
  }, [routeBookingId, routeExtensionId, routeTxRef]);

  const paymentStatusQuery = useQuery({
    queryKey: ["extension-payment-status", txRef, extensionId],
    enabled: canVerify && !pollingBudgetExpired,
    queryFn: async ({ signal }) => {
      try {
        let payment: ExtensionPaymentStatusResponse;
        const shouldConfirm =
          transactionId &&
          confirmationAttemptedFor.current !== confirmationKey;

        if (shouldConfirm) {
          confirmationAttemptedFor.current = confirmationKey;
          try {
            payment = await confirmExtensionPayment(
              {
                extensionId: extensionId ?? "",
                txRef: txRef ?? "",
                transactionId,
              },
              { signal },
            );
          } catch (error) {
            if (
              error instanceof ApiError &&
              error.status > 0 &&
              error.status < 500
            ) {
              throw error;
            }
            payment = await fetchExtensionPaymentStatus(txRef ?? "", {
              signal,
            });
          }
        } else {
          payment = await fetchExtensionPaymentStatus(txRef ?? "", { signal });
        }

        if (payment.extension.id !== extensionId) {
          throw new Error(
            "Payment verification does not match this booking extension.",
          );
        }

        return {
          ...payment,
          lifecycleState: getExtensionPaymentLifecycleState(payment),
        };
      } catch (error) {
        reportHandledException(error, {
          area: "booking_extension",
          operation: "verify_payment",
        });
        throw error;
      }
    },
    refetchInterval: (query) =>
      getPaymentStatusPollingInterval(
        query.state.data,
        query.state.error,
      ),
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 0,
  });

  const lifecycleState = paymentStatusQuery.data?.lifecycleState;

  useEffect(() => {
    if (!extensionId || !txRef) return;
    confirmationAttemptedFor.current = null;
    setPollingBudgetExpired(false);
  }, [extensionId, txRef]);

  useEffect(() => {
    if (!canVerify || lifecycleState !== "PENDING" || paymentStatusQuery.error) {
      return;
    }
    const timeout = setTimeout(
      () => setPollingBudgetExpired(true),
      POLLING_BUDGET_MS,
    );
    return () => clearTimeout(timeout);
  }, [canVerify, lifecycleState, paymentStatusQuery.error]);

  useEffect(() => {
    if (
      !txRef ||
      (lifecycleState !== "CONFIRMED" &&
        lifecycleState !== "FAILED" &&
        lifecycleState !== "EXPIRED")
    ) {
      return;
    }

    void deleteExtensionPaymentSession(txRef).catch((error) => {
      reportHandledException(error, {
        area: "booking_extension",
        operation: "delete_payment_session",
      });
    });
  }, [lifecycleState, txRef]);

  useEffect(() => {
    if (lifecycleState !== "CONFIRMED" || !bookingId) return;

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] }),
    ]).catch(() => undefined);

    const timeout = setTimeout(() => {
      router.replace(`/bookings/${bookingId}` as never);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [bookingId, lifecycleState, queryClient, router]);

  const viewBooking = () => {
    router.replace(bookingId ? (`/bookings/${bookingId}` as never) : "/");
  };
  const retryVerification = () => {
    confirmationAttemptedFor.current = null;
    setPollingBudgetExpired(false);
    void paymentStatusQuery.refetch();
  };

  if (isHydrating || isSessionHydrating) {
    return (
      <PaymentStatusMessage
        title="Preparing payment verification..."
        message="Please wait while we restore your session."
        tone="blue"
        loading
      />
    );
  }

  if (!canVerify) {
    return (
      <PaymentStatusMessage
        title="Payment verification unavailable"
        message="Payment verification credentials are missing. Contact support if you were charged."
        tone="red"
        primaryAction={{ label: "View booking", onPress: viewBooking }}
      />
    );
  }

  if (
    lifecycleState === "CONFIRMED" &&
    paymentStatusQuery.data
  ) {
    return (
      <PaymentStatusMessage
        title="Extension payment confirmed"
        message="Your trip extension is confirmed. Redirecting you to your booking..."
        tone="emerald"
        primaryAction={{ label: "View booking", onPress: viewBooking }}
      >
        <View className="mt-5 w-full rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <Text selectable className="text-sm text-emerald-800">
            Amount Paid:{" "}
            {formatCurrency(
              paymentStatusQuery.data.amountCharged ??
                paymentStatusQuery.data.amountExpected,
            )}
          </Text>
          <Text selectable className="mt-1 text-sm text-emerald-800">
            Reference: {txRef}
          </Text>
        </View>
      </PaymentStatusMessage>
    );
  }

  if (lifecycleState === "EXPIRED") {
    return (
      <PaymentStatusMessage
        title="Extension reservation expired"
        message="The extension hold expired before payment was confirmed."
        tone="orange"
        primaryAction={{ label: "View booking", onPress: viewBooking }}
      />
    );
  }

  if (lifecycleState === "FAILED") {
    return (
      <PaymentStatusMessage
        title="Extension payment needs attention"
        message="The extension could not be confirmed. Contact support if you were charged."
        tone="red"
        primaryAction={{ label: "View booking", onPress: viewBooking }}
      />
    );
  }

  if (pollingBudgetExpired) {
    return (
      <PaymentStatusMessage
        title="Payment still processing"
        message="Confirmation is taking longer than usual. Your extension has not been marked as failed."
        tone="blue"
        primaryAction={{
          label: "Retry verification",
          onPress: retryVerification,
        }}
        secondaryAction={{ label: "View booking", onPress: viewBooking }}
      />
    );
  }

  if (paymentStatusQuery.error) {
    return (
      <PaymentStatusMessage
        title="Payment verification unavailable"
        message={getBookingPaymentErrorMessage(paymentStatusQuery.error)}
        tone="red"
        primaryAction={{
          label: "Retry verification",
          onPress: retryVerification,
        }}
        secondaryAction={{ label: "View booking", onPress: viewBooking }}
      />
    );
  }

  return (
    <PaymentStatusMessage
      title="Confirming your extension payment"
      message="Keep this page open while we verify the transaction."
      tone="blue"
      loading
    />
  );
}
