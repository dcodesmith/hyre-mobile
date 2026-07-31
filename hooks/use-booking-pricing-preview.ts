import type { BookingPricingPreviewRequest } from "@/lib/booking-pricing-preview-types";
import { fetchBookingPricingPreview } from "@/services/booking-pricing-preview";
import { useQuery } from "@tanstack/react-query";

export function useBookingPricingPreview(
  request: BookingPricingPreviewRequest | null,
  authenticated = false,
) {
  return useQuery({
    queryKey: [
      "booking-pricing-preview",
      request?.carId,
      request?.bookingType,
      request?.startDate,
      request?.endDate,
      request?.pickupTime ?? null,
      request?.includeSecurityDetail ?? false,
      request?.requiresFullTank ?? false,
      authenticated,
    ],
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
