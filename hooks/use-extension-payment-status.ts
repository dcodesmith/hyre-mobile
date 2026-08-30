import { useAuth } from "@/hooks/use-auth";
import { getPaymentStatusPollingInterval } from "@/lib/payment-status-polling";
import { reportHandledException } from "@/lib/telemetry";
import { verifyExtensionPayment } from "@/services/extension-payment-verification";
import {
  deleteExtensionPaymentSession,
  getExtensionPaymentSession,
  type ExtensionPaymentSession,
} from "@/storage/extension-payment-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

const POLLING_BUDGET_MS = 90_000;

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function useExtensionPaymentStatus() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrating, user } = useAuth();
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
  const [expiredPollingKey, setExpiredPollingKey] = useState<string | null>(
    null,
  );
  const hasRouteSession = Boolean(
    routeBookingId && routeExtensionId && routeTxRef,
  );

  const storedSessionQuery = useQuery({
    queryKey: ["extension-payment-session", user?.id],
    enabled: !hasRouteSession && !isHydrating && isAuthenticated,
    queryFn: () =>
      getExtensionPaymentSession().catch((error) => {
        reportHandledException(error, {
          area: "booking_extension",
          operation: "hydrate_payment_session",
        });
        throw error;
      }),
    retry: false,
    staleTime: Infinity,
  });

  const routeSession: ExtensionPaymentSession | null =
    hasRouteSession && user
      ? {
          userId: user.id,
          bookingId: routeBookingId ?? "",
          extensionId: routeExtensionId ?? "",
          txRef: routeTxRef ?? "",
        }
      : null;
  const storedSession =
    storedSessionQuery.data?.userId === user?.id
      ? storedSessionQuery.data
      : null;
  const session =
    routeSession ??
    (storedSession && (!routeTxRef || storedSession.txRef === routeTxRef)
      ? storedSession
      : null);
  const bookingId = session?.bookingId;
  const extensionId = session?.extensionId;
  const txRef = session?.txRef;
  const sessionKey = extensionId && txRef ? `${extensionId}:${txRef}` : null;
  const confirmationKey =
    txRef && transactionId ? `${txRef}:${transactionId}` : null;
  const isSessionHydrating =
    !hasRouteSession &&
    !isHydrating &&
    isAuthenticated &&
    storedSessionQuery.isPending;
  const canVerify =
    !isHydrating &&
    !isSessionHydrating &&
    isAuthenticated &&
    Boolean(bookingId && extensionId && txRef);
  const pollingBudgetExpired =
    Boolean(sessionKey) && expiredPollingKey === sessionKey;

  const paymentStatusQuery = useQuery({
    queryKey: ["extension-payment-status", txRef, extensionId],
    enabled: canVerify && !pollingBudgetExpired,
    queryFn: ({ signal }) => {
      const shouldConfirm = Boolean(
        transactionId &&
          confirmationAttemptedFor.current !== confirmationKey,
      );
      if (shouldConfirm) {
        confirmationAttemptedFor.current = confirmationKey;
      }

      return verifyExtensionPayment({
        extensionId: extensionId ?? "",
        txRef: txRef ?? "",
        transactionId,
        shouldConfirm,
        signal,
      }).catch((error) => {
        reportHandledException(error, {
          area: "booking_extension",
          operation: "verify_payment",
        });
        throw error;
      });
    },
    refetchInterval: (query) =>
      getPaymentStatusPollingInterval(query.state.data, query.state.error),
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 0,
  });

  const lifecycleState = paymentStatusQuery.data?.lifecycleState;

  useEffect(() => {
    if (
      !canVerify ||
      !sessionKey ||
      pollingBudgetExpired ||
      (lifecycleState !== "PENDING" && lifecycleState !== "VERIFYING") ||
      paymentStatusQuery.error
    ) {
      return;
    }

    const timeout = setTimeout(
      () => setExpiredPollingKey(sessionKey),
      POLLING_BUDGET_MS,
    );
    return () => clearTimeout(timeout);
  }, [
    canVerify,
    lifecycleState,
    paymentStatusQuery.error,
    pollingBudgetExpired,
    sessionKey,
  ]);

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
    setExpiredPollingKey(null);
    void paymentStatusQuery.refetch();
  };

  return {
    canVerify,
    isHydrating: isHydrating || isSessionHydrating,
    lifecycleState,
    paymentStatusQuery,
    pollingBudgetExpired,
    retryVerification,
    txRef,
    viewBooking,
  };
}
