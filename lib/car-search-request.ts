import type { CarSearchParams } from "@/lib/car-types";
import { parseSearchId } from "@/lib/search-id";

const SCALAR_KEYS = [
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

export function carSearchQueryKeyParams(params: CarSearchParams): CarSearchParams {
  if (!params.countOnly) {
    return params;
  }

  const queryKeyParams = { ...params };
  delete queryKeyParams.searchId;
  return queryKeyParams;
}

export function buildCarSearchRequest(params: CarSearchParams): {
  readonly path: string;
  readonly headers?: Record<string, string>;
} {
  const searchParams = new URLSearchParams();

  for (const key of SCALAR_KEYS) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  if (params.fuelIncluded) searchParams.set("fuelIncluded", "1");
  if (params.dealsOnly) searchParams.set("dealsOnly", "1");
  if (params.countOnly) searchParams.set("countOnly", "1");

  const queryString = searchParams.toString();
  const path = queryString ? `/api/cars/search?${queryString}` : "/api/cars/search";
  const searchId = parseSearchId(params.searchId);

  return {
    path,
    headers:
      searchId && !params.countOnly ? { "X-Search-Id": searchId } : undefined,
  };
}
