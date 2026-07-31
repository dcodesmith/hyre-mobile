import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import {
  fetchBookingPaymentStatus,
  getBookingPaymentErrorMessage,
} from "@/services/booking-payment";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const POLLING_INTERVAL_MS = 3000;

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function PaymentStatusScreen() {
  const router = useRouter();
  const { isAuthenticated, isHydrating } = useAuth();
  const params = useLocalSearchParams<{
    tx_ref?: string;
    status?: string;
    transaction_id?: string;
    bookingId?: string;
    guestEmail?: string;
    transactionType?: string;
  }>();

  const txRef = readParam(params.tx_ref);
  const fwStatus = readParam(params.status);
  const bookingId = readParam(params.bookingId);
  const guestEmail = readParam(params.guestEmail);
  const transactionId = readParam(params.transaction_id);

  const terminalFlutterwaveState = fwStatus === "cancelled" || fwStatus === "failed";
  const canPollStatus =
    !isHydrating &&
    !terminalFlutterwaveState &&
    Boolean(txRef) &&
    Boolean(bookingId) &&
    (isAuthenticated || Boolean(guestEmail));

  const paymentStatusQuery = useQuery({
    queryKey: ["booking-payment-status", txRef, bookingId, guestEmail, isAuthenticated],
    enabled: canPollStatus,
    queryFn: ({ signal }) => {
      if (!txRef || !bookingId) {
        throw new Error("Missing transaction details for payment verification.");
      }
      return fetchBookingPaymentStatus({
        txRef,
        bookingId,
        isAuthenticated,
        guestEmail: isAuthenticated ? undefined : guestEmail,
      }, { signal });
    },
    refetchInterval: (query) => {
      if (query.state.data?.isConfirmed) {
        return false;
      }
      return POLLING_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 0,
  });

  useEffect(() => {
    if (!paymentStatusQuery.data?.isConfirmed) {
      return;
    }

    const timeout = setTimeout(() => {
      if (isAuthenticated && paymentStatusQuery.data?.bookingId) {
        router.replace((`/bookings/${paymentStatusQuery.data.bookingId}` as never));
        return;
      }
      router.replace("/");
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, paymentStatusQuery.data?.bookingId, paymentStatusQuery.data?.isConfirmed, router]);

  if (!txRef || !bookingId) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-red-700">Payment Status Error</Text>
          <Text className="mt-3 text-sm text-center text-red-600">
            Missing transaction details from Flutterwave callback. Please contact support if you
            were charged.
          </Text>
          <Pressable
            className="mt-6 h-11 min-w-[160px] items-center justify-center rounded-md bg-black px-5"
            onPress={() => router.replace("/")}
          >
            <Text className="text-sm font-semibold text-white">Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (fwStatus === "cancelled") {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-orange-700">Payment Cancelled</Text>
          <Text className="mt-3 text-sm text-center text-orange-600">
            You cancelled the payment process. No charge was made.
          </Text>
          <Pressable
            className="mt-6 h-11 min-w-[180px] items-center justify-center rounded-md bg-black px-5"
            onPress={() => router.replace("/")}
          >
            <Text className="text-sm font-semibold text-white">Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (fwStatus === "failed") {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-red-700">Payment Failed</Text>
          <Text className="mt-3 text-sm text-center text-red-600">
            Flutterwave reported this payment attempt as failed. Please try again.
          </Text>
          <Pressable
            className="mt-6 h-11 min-w-[180px] items-center justify-center rounded-md bg-black px-5"
            onPress={() => router.replace("/")}
          >
            <Text className="text-sm font-semibold text-white">Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (paymentStatusQuery.data?.isConfirmed) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-semibold text-emerald-700">Payment Successful</Text>
          <Text className="mt-3 text-sm text-center text-emerald-700">
            Your booking is confirmed. Redirecting you to bookings...
          </Text>
          <View className="mt-5 w-full rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <Text className="text-sm text-emerald-800">
              Amount Paid: {formatCurrency(paymentStatusQuery.data.totalAmount)}
            </Text>
            <Text className="mt-1 text-sm text-emerald-800">Reference: {txRef}</Text>
            {transactionId ? (
              <Text className="mt-1 text-sm text-emerald-800">Transaction ID: {transactionId}</Text>
            ) : null}
          </View>
          <Pressable
            className="mt-6 h-11 min-w-[180px] items-center justify-center rounded-md bg-black px-5"
            onPress={() =>
              isAuthenticated && paymentStatusQuery.data?.bookingId
                ? router.replace((`/bookings/${paymentStatusQuery.data.bookingId}` as never))
                : router.replace("/")
            }
          >
            <Text className="text-sm font-semibold text-white">
              {isAuthenticated ? "View Booking" : "Back to Home"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (paymentStatusQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-red-700">Verification Error</Text>
          <Text className="mt-3 text-sm text-center text-red-600">
            {getBookingPaymentErrorMessage(paymentStatusQuery.error)}
          </Text>
          <Pressable
            className="mt-6 h-11 min-w-[160px] items-center justify-center rounded-md bg-black px-5"
            onPress={() => void paymentStatusQuery.refetch()}
          >
            <Text className="text-sm font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right", "bottom"]}>
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-xl font-semibold text-blue-700">Verifying Payment...</Text>
        <Text className="mt-2 text-sm text-center text-blue-700">
          Please wait while we confirm your booking payment. Reference: {txRef}
        </Text>
      </View>
    </SafeAreaView>
  );
}
