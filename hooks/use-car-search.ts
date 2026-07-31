import { getJson } from "@/lib/api-client";
import type { CarSearchParams, CarSearchResponse } from "@/lib/car-types";
import { useQuery } from "@tanstack/react-query";

const CAR_SEARCH_QUERY_KEY = ["car-search"] as const;

async function fetchCarSearch(
  params: CarSearchParams,
  init?: RequestInit,
): Promise<CarSearchResponse> {
  const searchParams = new URLSearchParams();

  const scalarKeys = [
    "q",
    "serviceTier",
    "vehicleType",
    "color",
    "make",
    "model",
    "from",
    "to",
    "bookingType",
    "pickupTime",
    "flightNumber",
    "minPrice",
    "maxPrice",
    "minCapacity",
    "page",
    "limit",
  ] as const;

  for (const key of scalarKeys) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  if (params.fuelIncluded) searchParams.set("fuelIncluded", "1");
  if (params.dealsOnly) searchParams.set("dealsOnly", "1");
  if (params.countOnly) searchParams.set("countOnly", "1");

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/cars/search?${queryString}`
    : "/api/cars/search";

  return getJson<CarSearchResponse>(url, init);
}

export function useCarSearch(
  params: CarSearchParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...CAR_SEARCH_QUERY_KEY, params],
    queryFn: ({ signal }) => fetchCarSearch(params, { signal }),
    enabled: options?.enabled ?? true,
    // Promotion enrichment changes server-side; refetch on focus + every mount.
    staleTime: 30 * 1000,
    refetchOnMount: "always",
  });
}
