const POLLING_INTERVAL_MS = 3000;

export function getPaymentStatusPollingInterval(
  data:
    | {
        lifecycleState: "PENDING" | "CONFIRMED" | "FAILED" | "EXPIRED";
      }
    | undefined,
  error: Error | null,
): number | false {
  if (error || data?.lifecycleState !== "PENDING") return false;
  return POLLING_INTERVAL_MS;
}
