import {
  type SearchFlightResponse,
  searchAirportPickupFlight,
} from "@/services/flights";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export const flightSearchQueryKey = (flightNumber: string, date: string) =>
  ["search-flight", flightNumber, date] as const;

type UseFlightSearchArgs = {
  flightNumber: string;
  date: string;
  enabled?: boolean;
};

/**
 * Validates an airport-pickup flight for a given date.
 * Matches the declarative fetch style used by car/reviews hooks.
 */
export function useFlightSearch({
  flightNumber,
  date,
  enabled = true,
}: UseFlightSearchArgs) {
  return useQuery({
    queryKey: flightSearchQueryKey(flightNumber, date),
    queryFn: async ({ signal }): Promise<SearchFlightResponse> => {
      const result = await searchAirportPickupFlight({
        flightNumber,
        date,
        signal,
      });
      return {
        flight: {
          ...result.flight,
          warning: result.warning,
        },
        warning: result.warning,
      };
    },
    enabled: enabled && flightNumber.length > 0 && date.length > 0,
    staleTime: 60 * 1000,
  });
}

/** Imperative validate (search bar). Shares cache with `useFlightSearch`. */
export function useFetchFlightSearch() {
  const queryClient = useQueryClient();

  return useCallback(
    async (flightNumber: string, date: string) => {
      return queryClient.fetchQuery({
        queryKey: flightSearchQueryKey(flightNumber, date),
        queryFn: async ({ signal }) => {
          const result = await searchAirportPickupFlight({
            flightNumber,
            date,
            signal,
          });
          return {
            flight: {
              ...result.flight,
              warning: result.warning,
            },
            warning: result.warning,
          };
        },
        staleTime: 60 * 1000,
      });
    },
    [queryClient],
  );
}
