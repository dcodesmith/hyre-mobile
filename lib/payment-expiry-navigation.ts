export const PAYMENT_SEARCH_PARAM_KEYS = [
  "bookingType",
  "from",
  "to",
  "pickupTime",
  "flightNumber",
] as const;

export type PaymentSearchParams = Partial<
  Record<(typeof PAYMENT_SEARCH_PARAM_KEYS)[number], string>
>;

type RouteSearchParams = Partial<
  Record<
    (typeof PAYMENT_SEARCH_PARAM_KEYS)[number],
    string | string[] | undefined
  >
>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function buildExpiredBookingSearchDestination(
  params: RouteSearchParams,
): string {
  const searchParams = new URLSearchParams();
  for (const key of PAYMENT_SEARCH_PARAM_KEYS) {
    const value = firstParam(params[key]);
    if (value) searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `/search?${query}` : "/search";
}

export function shouldReconcileAfterBrowserClose(
  resultType: string,
  reservationExpiresAt: string,
  now = Date.now(),
): boolean {
  if (resultType !== "cancel" && resultType !== "dismiss") return false;

  const expiresAt = Date.parse(reservationExpiresAt);
  return Number.isFinite(expiresAt) && now >= expiresAt;
}
