import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api-client";
import type { CarDetailResponse } from "@/lib/car-detail-types";

const CAR_DETAIL_QUERY_KEY = ["car-detail"] as const;

async function fetchCarDetail(
  carId: string,
  from?: string,
  init?: RequestInit,
): Promise<CarDetailResponse> {
  const qs =
    from && from.length > 0 ? `?from=${encodeURIComponent(from)}` : "";
  return getJson<CarDetailResponse>(`/api/cars/${carId}${qs}`, init);
}

export type UseCarDetailOptions = {
  /** Promotion eligibility uses this day (worker passes `query.from` to enrichment). */
  from?: string;
};

/**
 * Fetches car details by ID from /api/cars/:id
 * Returns car data along with optional promotion for the reference date.
 */
export function useCarDetail(carId: string, options?: UseCarDetailOptions) {
  const from = options?.from;
  return useQuery({
    queryKey: [...CAR_DETAIL_QUERY_KEY, carId, from],
    queryFn: ({ signal }) => fetchCarDetail(carId, from, { signal }),
    enabled: true,
    // Match home/search so newly created promotions show up promptly.
    staleTime: 30 * 1000,
    refetchOnMount: "always",
  });
}
