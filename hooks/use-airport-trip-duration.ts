import { calculateAirportTripDuration } from "@/services/flights";
import { useMutation } from "@tanstack/react-query";

/**
 * Drive-time from Lagos airport → drop-off. Event-driven (drop-off selected).
 */
export function useAirportTripDuration() {
  return useMutation({
    mutationFn: async (destination: string) => {
      return calculateAirportTripDuration({ destination });
    },
  });
}
