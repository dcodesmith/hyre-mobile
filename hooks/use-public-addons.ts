import { fetchPublicAddons } from "@/lib/fetch-public-addons";
import type { BookingType } from "@/lib/booking-types";
import { useQuery } from "@tanstack/react-query";

export function usePublicAddons(bookingType: BookingType) {
  return useQuery({
    queryKey: ["public-addons", bookingType],
    queryFn: ({ signal }) => fetchPublicAddons(bookingType, { signal }),
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });
}
