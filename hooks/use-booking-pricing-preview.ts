import type { BookingPricingPreviewRequest } from "@/lib/booking-pricing-preview-types";
import { fetchBookingPricingPreview } from "@/services/booking-pricing-preview";
import { useQuery } from "@tanstack/react-query";

export const bookingPricingPreviewQueryKey = (
  request: BookingPricingPreviewRequest,
  authenticated: boolean,
) =>
  [
    "booking-pricing-preview",
    request.carId,
    request.bookingType,
    request.startDate,
    request.endDate,
    request.pickupTime,
    request.includeSecurityDetail,
    request.requiresFullTank,
    authenticated,
  ] as const;

export function useBookingPricingPreview(
  request: BookingPricingPreviewRequest | null,
  authenticated = false,
) {
  return useQuery({
    queryKey: request
      ? bookingPricingPreviewQueryKey(request, authenticated)
      : ["booking-pricing-preview", "disabled"],
    queryFn: ({ signal }) => {
      if (!request) {
        throw new Error("Booking pricing preview request is required.");
      }

      return fetchBookingPricingPreview(request, { signal }, authenticated);
    },
    enabled: request !== null,
    staleTime: 15 * 1000,
    refetchOnMount: "always",
  });
}
