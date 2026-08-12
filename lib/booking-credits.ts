export function getBookingCreditsToUse(
  enabled: boolean,
  availableCredits: number,
  maxCreditsPerBooking: number,
): number {
  if (!enabled) return 0;
  if (!Number.isFinite(availableCredits) || !Number.isFinite(maxCreditsPerBooking)) return 0;
  const credits = Math.max(0, Math.min(availableCredits, maxCreditsPerBooking));
  const kobo = credits * 100;
  return Math.floor(kobo + Number.EPSILON * Math.max(1, Math.abs(kobo))) / 100;
}
