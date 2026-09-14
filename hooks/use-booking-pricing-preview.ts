import type { BookingPricingPreviewRequest } from "@/lib/booking-pricing-preview-types";
import { reportHandledException } from "@/lib/telemetry";
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
    [...request.addonIds].sort().join(","),
    request.requiresFullTank,
    request.useCredits,
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
    queryFn: async ({ signal }) => {
      if (!request) {
        throw new Error("Booking pricing preview request is required.");
      }

      try {
        return await fetchBookingPricingPreview(
          request,
          { signal },
          authenticated,
        );
      } catch (error) {
        reportHandledException(error, {
          area: "booking_pricing",
          operation: "preview",
        });
        throw error;
      }
    },
    enabled: request !== null,
    staleTime: 15 * 1000,
    refetchOnMount: "always",
  });
}
