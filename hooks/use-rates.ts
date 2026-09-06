import { getJson } from "@/lib/api-client";
import type { RatesResponse } from "@/lib/car-detail-types";
import { useQuery } from "@tanstack/react-query";

const RATES_QUERY_KEY = ["rates"] as const;

async function fetchRates(init?: RequestInit): Promise<RatesResponse> {
	return getJson<RatesResponse>("/api/rates", init);
}

export function useRates() {
	return useQuery({
		queryKey: RATES_QUERY_KEY,
		queryFn: ({ signal }) => fetchRates({ signal }),
		staleTime: 30 * 1000,
		refetchOnMount: "always",
		refetchOnReconnect: true,
	});
}
