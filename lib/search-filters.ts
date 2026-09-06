import type { CarSearchParams } from "./car-types";

/**
 * Shared search-filter definitions for the search screen and the filter sheet.
 * Ported from the web app (hireApp) to keep the two clients in lockstep. Reads
 * from / writes to URLSearchParams so it can seed drafts from route params and
 * build navigation query strings.
 */

export const VEHICLE_TYPES = ["SEDAN", "SUV", "VAN", "CROSSOVER"] as const;
export const SERVICE_TIERS = [
  "STANDARD",
  "EXECUTIVE",
  "LUXURY",
  "ULTRA_LUXURY",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type ServiceTier = (typeof SERVICE_TIERS)[number];

export const vehicleTypeLabels: Record<VehicleType, string> = {
  SEDAN: "Sedan",
  SUV: "SUV",
  VAN: "Van / Minibus",
  CROSSOVER: "Crossover",
};

export const serviceTierLabels: Record<ServiceTier, string> = {
  STANDARD: "Standard",
  EXECUTIVE: "Executive",
  LUXURY: "Luxury",
  ULTRA_LUXURY: "Ultra Luxury",
};

export const CAPACITY_OPTIONS = [4, 5, 6, 7] as const;

export const PRICE_UNIT_LABELS: Record<string, string> = {
  DAY: "per day",
  NIGHT: "per night",
  FULL_DAY: "per full day",
  AIRPORT_PICKUP: "per pickup",
};

/** Round the slider step to a friendly value based on the price range. */
export function getSliderStep(range: number): number {
  if (range <= 0) return 1;
  const raw = range / 100;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1, Math.ceil(raw / magnitude) * magnitude);
}

export function isServiceTier(value: string): value is ServiceTier {
  return (SERVICE_TIERS as readonly string[]).includes(value);
}

export function isVehicleType(value: string): value is VehicleType {
  return (VEHICLE_TYPES as readonly string[]).includes(value);
}

const VEHICLE_TYPE_NOUNS: Readonly<
  Record<VehicleType, { singular: string; plural: string }>
> = {
  SEDAN: { singular: "sedan", plural: "sedans" },
  SUV: { singular: "SUV", plural: "SUVs" },
  VAN: { singular: "van / minibus", plural: "vans / minibuses" },
  CROSSOVER: { singular: "crossover", plural: "crossovers" },
};

export function buildResultsHeading(
  total: number,
  vehicleTypes: readonly string[],
): string {
  const types = vehicleTypes.filter(isVehicleType);
  const form = total === 1 ? "singular" : "plural";

  if (types.length === 0) {
    return `${total} ${total === 1 ? "vehicle" : "vehicles"}`;
  }

  const nouns = types.map((type) => VEHICLE_TYPE_NOUNS[type][form]);
  const conjunction = total === 1 ? " or " : " and ";
  const joined =
    nouns.length > 1
      ? `${nouns.slice(0, -1).join(", ")}${conjunction}${nouns.at(-1)}`
      : nouns[0];

  return `${total} ${joined}`;
}

export interface SearchFilterValues {
  vehicleTypes: VehicleType[];
  serviceTiers: ServiceTier[];
  makes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minCapacity: number | null;
  fuelIncluded: boolean;
  dealsOnly: boolean;
}

/** URL params owned by the filter panel (cleared by "Clear all"). */
export const SEARCH_FILTER_PARAM_KEYS = [
  "vehicleType",
  "serviceTier",
  "make",
  "minPrice",
  "maxPrice",
  "minCapacity",
  "fuelIncluded",
  "dealsOnly",
] as const;

export function emptySearchFilters(): SearchFilterValues {
  return {
    vehicleTypes: [],
    serviceTiers: [],
    makes: [],
    minPrice: null,
    maxPrice: null,
    minCapacity: null,
    fuelIncluded: false,
    dealsOnly: false,
  };
}

function parseListParam(value: string | null): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function parseNonNegativeInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseBooleanParam(value: string | null): boolean {
  return value === "1" || value === "true";
}

/** Expo Router params (string | string[]) → URLSearchParams (first value wins). */
export function routeParamsToSearchParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single != null) searchParams.set(key, single);
  }
  return searchParams;
}

export function parseSearchFilters(
  searchParams: URLSearchParams,
): SearchFilterValues {
  const vehicleTypes = [
    ...new Set(
      parseListParam(searchParams.get("vehicleType"))
        .map((value) => value.toUpperCase())
        .filter(isVehicleType),
    ),
  ];

  const serviceTiers = [
    ...new Set(
      parseListParam(searchParams.get("serviceTier"))
        .map((value) => value.toUpperCase())
        .filter(isServiceTier),
    ),
  ];

  const makes = parseListParam(searchParams.get("make")).slice(0, 20);

  return {
    vehicleTypes,
    serviceTiers,
    makes,
    minPrice: parseNonNegativeInt(searchParams.get("minPrice")),
    maxPrice: parseNonNegativeInt(searchParams.get("maxPrice")),
    minCapacity: parseNonNegativeInt(searchParams.get("minCapacity")),
    fuelIncluded: parseBooleanParam(searchParams.get("fuelIncluded")),
    dealsOnly: parseBooleanParam(searchParams.get("dealsOnly")),
  };
}

/**
 * Writes filter values into URL params (removing keys for unset values).
 * Also resets pagination since results change.
 */
export function applySearchFiltersToParams(
  params: URLSearchParams,
  filters: SearchFilterValues,
): URLSearchParams {
  const setOrDelete = (key: string, value: string | null) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  };

  const numberOrNull = (value: number | null) =>
    value === null ? null : String(value);

  setOrDelete("vehicleType", filters.vehicleTypes.join(",") || null);
  setOrDelete("serviceTier", filters.serviceTiers.join(",") || null);
  setOrDelete("make", filters.makes.join(",") || null);
  setOrDelete("minPrice", numberOrNull(filters.minPrice));
  setOrDelete("maxPrice", numberOrNull(filters.maxPrice));
  setOrDelete("minCapacity", numberOrNull(filters.minCapacity));
  setOrDelete("fuelIncluded", filters.fuelIncluded ? "1" : null);
  setOrDelete("dealsOnly", filters.dealsOnly ? "1" : null);
  params.delete("page");

  return params;
}

/** Draft filters → search hook params (for live count + applied query). */
export function searchFiltersToParams(
  filters: SearchFilterValues,
): Partial<CarSearchParams> {
  return {
    vehicleType: filters.vehicleTypes.join(",") || undefined,
    serviceTier: filters.serviceTiers.join(",") || undefined,
    make: filters.makes.join(",") || undefined,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minCapacity: filters.minCapacity ?? undefined,
    fuelIncluded: filters.fuelIncluded || undefined,
    dealsOnly: filters.dealsOnly || undefined,
  };
}

/** Number of active filter selections, shown as a badge on the Filters button. */
export function countActiveSearchFilters(filters: SearchFilterValues): number {
  const hasPriceFilter =
    filters.minPrice !== null || filters.maxPrice !== null;
  const hasCapacityFilter = filters.minCapacity !== null;

  return (
    filters.vehicleTypes.length +
    filters.serviceTiers.length +
    filters.makes.length +
    (hasPriceFilter ? 1 : 0) +
    (hasCapacityFilter ? 1 : 0) +
    (filters.fuelIncluded ? 1 : 0) +
    (filters.dealsOnly ? 1 : 0)
  );
}
