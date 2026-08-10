import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { PaymentStatusMessage } from "@/components/payment-status-message";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { getPaymentStatusPollingInterval } from "@/lib/payment-status-polling";
import {
  confirmBookingPayment,
  fetchBookingPaymentStatus,
  getBookingPaymentErrorMessage,
} from "@/services/booking-payment";
import {
  deletePaymentStatusToken,
  getPaymentStatusToken,
} from "@/storage/payment-status-token";

const POLLING_BUDGET_MS = 90_000;
const TERMINAL_PAYMENT_MESSAGES = {
  FAILED: {
    title: "Payment Failed",
    message:
      "The payment could not be completed. If you were charged, contact support with reference",
    tone: "red",
  },
  EXPIRED: {
    title: "Payment Session Expired",
    message:
      "The booking reservation expired before payment was confirmed. If you were charged, contact support with reference",
    tone: "orange",
  },
} as const;

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function useStoredPaymentStatusToken(
  bookingId: string | undefined,
  isAuthenticated: boolean,
) {
  const [token, setToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let active = true;
    setIsHydrating(true);
    setToken(null);
    if (!bookingId || isAuthenticated) {
      setIsHydrating(false);
      return;
    }

    void getPaymentStatusToken(bookingId)
      .then((storedToken) => {
        if (active) setToken(storedToken);
      })
      .catch(() => {
        if (active) setToken(null);
      })
      .finally(() => {
        if (active) setIsHydrating(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, isAuthenticated]);

  return {
    paymentStatusToken: isAuthenticated ? null : token,
    isTokenHydrating: isAuthenticated ? false : isHydrating,
  };
}

function getSetupErrorMessage(
  txRef: string | undefined,
  bookingId: string | undefined,
  isCredentialHydrating: boolean,
  canPollStatus: boolean,
): string | undefined {
  if (!txRef || !bookingId) {
    return "Missing transaction details from Flutterwave callback. Please contact support if you were charged.";
  }
  if (!isCredentialHydrating && !canPollStatus) {
    return "Payment verification credentials are missing. Please contact support if you were charged.";
  }
  return undefined;
}

export default function PaymentStatusScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrating } = useAuth();
  const confirmationAttemptedFor = useRef<string | null>(null);
  const [pollingBudgetExpired, setPollingBudgetExpired] = useState(false);
  const pollingStartedAt = useRef<number | null>(null);
  const params = useLocalSearchParams<{
    tx_ref?: string;
    transaction_id?: string;
    bookingId?: string;
  }>();

  const txRef = readParam(params.tx_ref);
  const bookingId = readParam(params.bookingId);
  const transactionId = readParam(params.transaction_id);
  const { paymentStatusToken, isTokenHydrating } =
    useStoredPaymentStatusToken(bookingId, isAuthenticated);
  const callbackConfirmationKey =
    txRef && transactionId ? `${txRef}:${transactionId}` : null;
  const hasGuestAccess = Boolean(paymentStatusToken);
  const useAuthenticatedAccess = isAuthenticated;

  const canPollStatus =
    Boolean(txRef) &&
    Boolean(bookingId) &&
    !isTokenHydrating &&
    !isHydrating &&
    (hasGuestAccess || useAuthenticatedAccess);

  const paymentStatusQuery = useQuery({
    queryKey: [
      "booking-payment-status",
      txRef,
      bookingId,
      useAuthenticatedAccess,
    ],
    enabled: canPollStatus && !pollingBudgetExpired,
    queryFn: async ({ signal }) => {
      const shouldConfirm = Boolean(
        transactionId &&
          confirmationAttemptedFor.current !== callbackConfirmationKey,
      );
      const request = {
        txRef: txRef ?? "",
        bookingId: bookingId ?? "",
        isAuthenticated: useAuthenticatedAccess,
        paymentStatusToken: paymentStatusToken ?? undefined,
      };
      const result =
        transactionId && shouldConfirm
          ? await confirmBookingPayment(
              { ...request, transactionId },
              { signal },
            )
          : await fetchBookingPaymentStatus(request, { signal });
      if (shouldConfirm) {
        confirmationAttemptedFor.current = callbackConfirmationKey;
      }
      return result;
    },
    refetchInterval: (query) =>
      getPaymentStatusPollingInterval(query.state.data, query.state.error),
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 0,
  });

  const lifecycleState = paymentStatusQuery.data?.lifecycleState;

  useEffect(() => {
    if (!bookingId || !txRef) return;
    confirmationAttemptedFor.current = null;
    pollingStartedAt.current = null;
    setPollingBudgetExpired(false);
  }, [bookingId, txRef]);

  useEffect(() => {
    if (
      pollingBudgetExpired ||
      !canPollStatus ||
      lifecycleState === "CONFIRMED" ||
      lifecycleState === "FAILED" ||
      lifecycleState === "EXPIRED" ||
      paymentStatusQuery.error
    ) {
      return;
    }

    const startedAt = pollingStartedAt.current ?? Date.now();
    pollingStartedAt.current = startedAt;
    const remainingBudget = Math.max(
      0,
      POLLING_BUDGET_MS - (Date.now() - startedAt),
    );
    const timeout = setTimeout(
      () => setPollingBudgetExpired(true),
      remainingBudget,
    );
    return () => clearTimeout(timeout);
  }, [
    canPollStatus,
    lifecycleState,
    paymentStatusQuery.error,
    pollingBudgetExpired,
  ]);

  useEffect(() => {
    if (
      !bookingId ||
      !paymentStatusToken ||
      lifecycleState === undefined ||
      lifecycleState === "PENDING"
    ) {
      return;
    }
    void deletePaymentStatusToken(bookingId).catch(() => undefined);
  }, [bookingId, lifecycleState, paymentStatusToken]);

  useEffect(() => {
    if (paymentStatusQuery.data?.lifecycleState !== "CONFIRMED") {
      return;
    }

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      queryClient.invalidateQueries({
        queryKey: ["booking", paymentStatusQuery.data.bookingId],
      }),
    ]);

    const destination = useAuthenticatedAccess
      ? (`/bookings/${paymentStatusQuery.data.bookingId}` as never)
      : "/";
    const timeout = setTimeout(() => {
      router.replace(destination);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [
    useAuthenticatedAccess,
    paymentStatusQuery.data?.bookingId,
    paymentStatusQuery.data?.lifecycleState,
    queryClient,
    router,
  ]);

  const retryVerification = () => {
    confirmationAttemptedFor.current = null;
    pollingStartedAt.current = Date.now();
    setPollingBudgetExpired(false);
    void paymentStatusQuery.refetch();
  };
  const terminalMessage =
    TERMINAL_PAYMENT_MESSAGES[
      lifecycleState as keyof typeof TERMINAL_PAYMENT_MESSAGES
    ];
  const setupErrorMessage = getSetupErrorMessage(
    txRef,
    bookingId,
    isHydrating || isTokenHydrating,
    canPollStatus,
  );

  if (setupErrorMessage) {
    return (
      <PaymentStatusMessage
        title="Payment Status Error"
        message={setupErrorMessage}
        tone="red"
        primaryAction={{
          label: "Back to Home",
          onPress: () => router.replace("/"),
        }}
      />
    );
  }

  if (paymentStatusQuery.data?.lifecycleState === "CONFIRMED") {
    return (
      <PaymentStatusMessage
        title="Payment Successful"
        message="Your booking is confirmed. Redirecting you to bookings..."
        tone="emerald"
        primaryAction={{
          label: useAuthenticatedAccess ? "View Booking" : "Back to Home",
          onPress: () =>
            useAuthenticatedAccess && paymentStatusQuery.data?.bookingId
              ? router.replace(
                  `/bookings/${paymentStatusQuery.data.bookingId}` as never,
                )
              : router.replace("/"),
        }}
      >
        <View className="mt-5 w-full rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <Text selectable className="text-sm text-emerald-800">
            Amount Paid: {formatCurrency(paymentStatusQuery.data.totalAmount)}
          </Text>
          <Text selectable className="mt-1 text-sm text-emerald-800">
            Reference: {txRef}
          </Text>
          {transactionId ? (
            <Text selectable className="mt-1 text-sm text-emerald-800">
              Transaction ID: {transactionId}
            </Text>
          ) : null}
        </View>
      </PaymentStatusMessage>
    );
  }

  if (terminalMessage) {
    return (
      <PaymentStatusMessage
        title={terminalMessage.title}
        message={`${terminalMessage.message} ${txRef}.`}
        tone={terminalMessage.tone}
        primaryAction={{
          label: "Back to Home",
          onPress: () => router.replace("/"),
        }}
      />
    );
  }

  if (pollingBudgetExpired) {
    return (
      <PaymentStatusMessage
        title="Payment Still Processing"
        message="Confirmation is taking longer than usual. We will keep reconciling it safely in the background."
        tone="blue"
        primaryAction={{
          label: "Check Again",
          onPress: retryVerification,
        }}
        secondaryAction={{
          label: "Back to Home",
          onPress: () => router.replace("/"),
        }}
      />
    );
  }

  if (paymentStatusQuery.error) {
    return (
      <PaymentStatusMessage
        title="Verification Error"
        message={getBookingPaymentErrorMessage(paymentStatusQuery.error)}
        tone="red"
        primaryAction={{ label: "Retry", onPress: retryVerification }}
      />
    );
  }

  return (
    <PaymentStatusMessage
      title="Verifying Payment..."
      message={`Please wait while we confirm your booking payment. Reference: ${txRef}`}
      tone="blue"
      loading
    />
  );
}
