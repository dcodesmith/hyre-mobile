export function getBookingCreditsToUse(
  enabled: boolean,
  availableCredits: number,
  maxCreditsPerBooking: number,
): number {
  if (!enabled) return 0;
  if (!Number.isFinite(availableCredits) || !Number.isFinite(maxCreditsPerBooking)) return 0;
  const credits = Math.max(0, Math.min(availableCredits, maxCreditsPerBooking));
  return Math.floor(credits * 100) / 100;
}
