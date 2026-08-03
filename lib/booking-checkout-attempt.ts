export type BookingCheckoutAttempt = {
  readonly fingerprint: string;
  readonly idempotencyKey: string;
};

export function getBookingCheckoutAttempt(
  current: BookingCheckoutAttempt | null,
  payload: object,
  createIdempotencyKey: () => string,
): BookingCheckoutAttempt {
  const fingerprint = JSON.stringify(payload);
  if (current?.fingerprint === fingerprint) return current;

  return {
    fingerprint,
    idempotencyKey: createIdempotencyKey(),
  };
}
