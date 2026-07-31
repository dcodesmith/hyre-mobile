/**
 * Types for the car categories API
 */

/** Enriched on cars/categories, search, and public car detail (hyre-worker). */
export interface CarPromotion {
  readonly id: string;
  readonly name: string | null;
  readonly discountValue: number;
}

/** Car data from the API */
export interface PublicCar {
  id: string;
  make: string;
  model: string;
  year: number;
  dayRate: number;
  passengerCapacity: number;
  pricingIncludesFuel: boolean;
  vehicleType: string;
  serviceTier: string;
  images: { url: string }[];
  /** Visible-review aggregates for card badges. */
  averageRating: number;
  totalReviews: number;
  /** Active promotion for the reference date (see API `from` query). */
  promotion?: CarPromotion | null;
}

/** Single category in the response */
export interface CarCategory {
  name: string;
  title: string;
  type: "serviceTier" | "vehicleType" | "make";
  cars: PublicCar[];
}

/** Response shape for GET /api/cars/categories */
export interface CarCategoriesResponse {
  categories: CarCategory[];
  allCars: PublicCar[];
  total: number;
}

/**
 * Types for the car search API
 */

/** Car owner info for search results */
export interface CarOwner {
  username: string | null;
  name: string;
}

/** Extended car type for search results */
export interface SearchCar {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  dayRate: number;
  nightRate: number | null;
  fullDayRate: number | null;
  airportPickupRate: number | null;
  passengerCapacity: number;
  pricingIncludesFuel: boolean;
  vehicleType: string;
  serviceTier: string;
  images: { url: string }[];
  /** Visible-review aggregates for card badges. */
  averageRating: number;
  totalReviews: number;
  owner: CarOwner;
  promotion?: CarPromotion | null;
}

/** Applied filters in the response */
export interface SearchFilters {
  serviceTiers: string[];
  vehicleTypes: string[];
  bookingType: string | null;
}

/** Aggregated facets used to build the filter UI (null in countOnly mode). */
export interface SearchFacets {
  makes: { name: string; count: number }[];
  price: { min: number; max: number };
}

/** Pagination metadata */
export interface SearchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Response shape for GET /api/cars/search */
export interface CarSearchResponse {
  cars: SearchCar[];
  filters: SearchFilters;
  facets: SearchFacets | null;
  pagination: SearchPagination;
}

/** Query params for car search */
export interface CarSearchParams {
  q?: string;
  /** Comma-separated for multi-select (e.g. "SUV,SEDAN"). */
  serviceTier?: string;
  /** Comma-separated for multi-select. */
  vehicleType?: string;
  color?: string;
  /** Comma-separated for multi-select. */
  make?: string;
  model?: string;
  from?: string;
  to?: string;
  bookingType?: string;
  pickupTime?: string;
  flightNumber?: string;
  minPrice?: number;
  maxPrice?: number;
  minCapacity?: number;
  fuelIncluded?: boolean;
  dealsOnly?: boolean;
  /** Return only pagination.total (no cars/facets). */
  countOnly?: boolean;
  page?: number;
  limit?: number;
}
