import type { BookingPaymentLifecycleState } from "@/services/booking-payment";

const POLLING_INTERVAL_MS = 3000;

export function getPaymentStatusPollingInterval(
  data: { lifecycleState: BookingPaymentLifecycleState } | undefined,
  error: Error | null,
): number | false {
  if (error || data?.lifecycleState !== "PENDING") return false;
  return POLLING_INTERVAL_MS;
}
