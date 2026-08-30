import { PaymentStatusMessage } from "@/components/payment-status-message";
import { useExtensionPaymentStatus } from "@/hooks/use-extension-payment-status";
import { formatCurrency } from "@/lib/currency";
import { getBookingPaymentErrorMessage } from "@/services/booking-payment";
import { Text, View } from "react-native";

export function ExtensionPaymentStatusScreen() {
  const status = useExtensionPaymentStatus();

  if (status.isHydrating) {
    return (
      <PaymentStatusMessage
        title="Preparing payment verification..."
        message="Please wait while we restore your session."
        tone="blue"
        loading
      />
    );
  }

  if (!status.canVerify) {
    return (
      <PaymentStatusMessage
        title="Payment verification unavailable"
        message="Payment verification credentials are missing. Contact support if you were charged."
        tone="red"
        primaryAction={{
          label: "View booking",
          onPress: status.viewBooking,
        }}
      />
    );
  }

  if (
    status.lifecycleState === "CONFIRMED" &&
    status.paymentStatusQuery.data
  ) {
    return (
      <PaymentStatusMessage
        title="Extension payment confirmed"
        message="Your trip extension is confirmed. Redirecting you to your booking..."
        tone="emerald"
        primaryAction={{
          label: "View booking",
          onPress: status.viewBooking,
        }}
      >
        <View className="mt-5 w-full rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <Text selectable className="text-sm text-emerald-800">
            Amount Paid:{" "}
            {formatCurrency(
              status.paymentStatusQuery.data.amountCharged ??
                status.paymentStatusQuery.data.amountExpected,
            )}
          </Text>
          <Text selectable className="mt-1 text-sm text-emerald-800">
            Reference: {status.txRef}
          </Text>
        </View>
      </PaymentStatusMessage>
    );
  }

  if (status.lifecycleState === "EXPIRED") {
    return (
      <PaymentStatusMessage
        title="Extension reservation expired"
        message="The extension hold expired before payment was confirmed."
        tone="orange"
        primaryAction={{
          label: "View booking",
          onPress: status.viewBooking,
        }}
      />
    );
  }

  if (status.lifecycleState === "FAILED") {
    return (
      <PaymentStatusMessage
        title="Extension payment needs attention"
        message="The extension could not be confirmed. Contact support if you were charged."
        tone="red"
        primaryAction={{
          label: "View booking",
          onPress: status.viewBooking,
        }}
      />
    );
  }

  if (status.pollingBudgetExpired) {
    return (
      <PaymentStatusMessage
        title="Payment still processing"
        message="Confirmation is taking longer than usual. Your extension has not been marked as failed."
        tone="blue"
        primaryAction={{
          label: "Retry verification",
          onPress: status.retryVerification,
        }}
        secondaryAction={{
          label: "View booking",
          onPress: status.viewBooking,
        }}
      />
    );
  }

  if (status.paymentStatusQuery.error) {
    return (
      <PaymentStatusMessage
        title="Payment verification unavailable"
        message={getBookingPaymentErrorMessage(
          status.paymentStatusQuery.error,
        )}
        tone="red"
        primaryAction={{
          label: "Retry verification",
          onPress: status.retryVerification,
        }}
        secondaryAction={{
          label: "View booking",
          onPress: status.viewBooking,
        }}
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
