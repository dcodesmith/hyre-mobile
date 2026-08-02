import { useQuery } from "@tanstack/react-query";

import { fetchBookingById } from "@/services/bookings";

export function useBookingDetail(
  bookingId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["booking", bookingId],
    queryFn: ({ signal }) => fetchBookingById(bookingId ?? "", { signal }),
    enabled: enabled && Boolean(bookingId),
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: true,
  });
}
