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
  if (payment.status === "SUCCESSFUL") return "FAILED";
  if (payment.extension.status === "CANCELLED") return "EXPIRED";
  if (payment.status === "PENDING") return "PENDING";
  return "FAILED";
}
