import { getJson } from "@/lib/api-client";
import type { CarCategoriesResponse } from "@/lib/car-types";
import { useQuery } from "@tanstack/react-query";

const CAR_CATEGORIES_QUERY_KEY = ["car-categories"] as const;

async function fetchCarCategories(
	limit = 50,
	init?: RequestInit,
): Promise<CarCategoriesResponse> {
	return getJson<CarCategoriesResponse>(
		`/api/cars/categories?limit=${limit}`,
		init,
	);
}

/**
 * Promotions can change server-side at any time, so we keep this fresh:
 * 30s staleTime + refetch on every mount/focus picks up new discounts without
 * forcing the user to relaunch the app.
 */
export function useCarCategories(limit = 50) {
	return useQuery({
		queryKey: [...CAR_CATEGORIES_QUERY_KEY, limit],
		queryFn: ({ signal }) => fetchCarCategories(limit, { signal }),
		staleTime: 30 * 1000,
		refetchOnMount: "always",
		refetchOnReconnect: true,
	});
}
