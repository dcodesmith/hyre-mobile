import type { CarCategory } from "./car-types";

const VEHICLE_TYPE_CATEGORY_QUERY: Partial<
  Record<CarCategory["name"], string>
> = {
  suv: "vehicleType=SUV",
  sedan: "vehicleType=SEDAN",
};

const SERVICE_TIER_CATEGORY_QUERY: Partial<
  Record<CarCategory["name"], string>
> = {
  luxury: "serviceTier=LUXURY",
  executive: "serviceTier=EXECUTIVE",
  budget: "serviceTier=STANDARD",
};

/**
 * Builds a stable search query string for category CTA navigation.
 *
 * NOTE: "popular" is a mixed make bucket and cannot be represented by one strict
 * filter value with the current API contract, so it intentionally returns empty.
 */
export function buildCategorySearchQuery(category: CarCategory): string {
  if (category.type === "vehicleType") {
    return VEHICLE_TYPE_CATEGORY_QUERY[category.name] ?? "";
  }

  if (category.type === "serviceTier") {
    return SERVICE_TIER_CATEGORY_QUERY[category.name] ?? "";
  }

  return "";
}
