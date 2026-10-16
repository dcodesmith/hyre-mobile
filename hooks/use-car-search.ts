import { getJson } from "@/lib/api-client";
import {
  buildCarSearchRequest,
  carSearchQueryKeyParams,
} from "@/lib/car-search-request";
import type { CarSearchParams, CarSearchResponse } from "@/lib/car-types";
import { useQuery } from "@tanstack/react-query";

const CAR_SEARCH_QUERY_KEY = ["car-search"] as const;

async function fetchCarSearch(
  params: CarSearchParams,
  init?: RequestInit,
): Promise<CarSearchResponse> {
  const request = buildCarSearchRequest(params);
  const headers = new Headers(init?.headers);

  if (request.headers) {
    for (const [key, value] of Object.entries(request.headers)) {
      headers.set(key, value);
    }
  }

  return getJson<CarSearchResponse>(request.path, { ...init, headers });
}

export function useCarSearch(
  params: CarSearchParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...CAR_SEARCH_QUERY_KEY, carSearchQueryKeyParams(params)],
    queryFn: ({ signal }) => fetchCarSearch(params, { signal }),
    enabled: options?.enabled ?? true,
    // Promotion enrichment changes server-side; refetch on focus + every mount.
    staleTime: 30 * 1000,
    refetchOnMount: "always",
  });
}
