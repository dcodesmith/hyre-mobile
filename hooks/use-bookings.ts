import { useQuery } from "@tanstack/react-query";

import { fetchBookingsByStatus } from "@/services/bookings";

export function useBookings(enabled: boolean) {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: ({ signal }) => fetchBookingsByStatus({ signal }),
    enabled,
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: true,
  });
}
