import type {
  BookingPaymentLifecycleState,
  ExtensionPaymentStatusResponse,
} from "@/services/booking-payment";

export function getExtensionPaymentLifecycleState(
  payment: ExtensionPaymentStatusResponse,
): BookingPaymentLifecycleState {
  if (
    payment.status === "SUCCESSFUL" &&
    payment.extension.status === "ACTIVE"
  ) {
    return "CONFIRMED";
  }
  if (payment.extension.status === "CANCELLED") {
    return payment.status === "SUCCESSFUL" ? "FAILED" : "EXPIRED";
  }
  if (payment.status === "SUCCESSFUL") return "VERIFYING";
  if (payment.status === "PENDING") return "PENDING";
  return "FAILED";
}
