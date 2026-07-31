import { ApiError, getJson } from "@/lib/api-client";

const SEARCH_FLIGHT_ENDPOINT = "/api/search-flight";
const TRIP_DURATION_ENDPOINT = "/api/calculate-trip-duration";

export type ValidatedFlight = {
  flightNumber: string;
  flightId: string;
  origin: string;
  originIATA?: string;
  originName?: string;
  destination: string;
  destinationIATA?: string;
  destinationName?: string;
  destinationCity?: string;
  scheduledArrival: string;
  estimatedArrival?: string;
  actualArrival?: string;
  status?: string;
  warning?: string;
};

export type SearchFlightResponse = {
  flight: ValidatedFlight;
  warning?: string;
};

export type TripDurationResponse = {
  durationMinutes: number;
  distanceMeters: number;
  isEstimate: boolean;
};

export async function searchAirportPickupFlight(params: {
  flightNumber: string;
  date: string;
  signal?: AbortSignal;
}): Promise<SearchFlightResponse> {
  const search = new URLSearchParams({
    flightNumber: params.flightNumber,
    date: params.date,
  });
  return getJson<SearchFlightResponse>(
    `${SEARCH_FLIGHT_ENDPOINT}?${search.toString()}`,
    params.signal ? { signal: params.signal } : undefined,
  );
}

export async function calculateAirportTripDuration(params: {
  destination: string;
  signal?: AbortSignal;
}): Promise<TripDurationResponse> {
  const search = new URLSearchParams({
    destination: params.destination,
  });
  return getJson<TripDurationResponse>(
    `${TRIP_DURATION_ENDPOINT}?${search.toString()}`,
    params.signal ? { signal: params.signal } : undefined,
  );
}

export function getFlightSearchErrorMessage(
  error: unknown,
  fallback = "Unable to validate that flight. Please try again.",
): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export type FlightSearchValidation = {
  flight: ValidatedFlight | null;
  message: string | null;
  shortMessage: string | null;
  unbookable: boolean;
};

const EMPTY_FLIGHT_VALIDATION: FlightSearchValidation = {
  flight: null,
  message: null,
  shortMessage: null,
  unbookable: false,
};

export function clearFlightSearchValidation(): FlightSearchValidation {
  return { ...EMPTY_FLIGHT_VALIDATION };
}

export function flightSearchValidationFromSuccess(
  response: SearchFlightResponse,
): FlightSearchValidation {
  return {
    flight: response.flight,
    message: null,
    shortMessage: null,
    unbookable: false,
  };
}

export function flightSearchValidationFromLocalMessage(
  message: string,
): FlightSearchValidation {
  return {
    flight: null,
    message,
    shortMessage: message,
    unbookable: true,
  };
}

/** Nest `errorCode` values for `/api/search-flight` (see worker FlightAwareErrorCode). */
const FLIGHT_SEARCH_SHORT_ERROR: Record<string, string> = {
  FLIGHT_ALREADY_LANDED: "Flight already landed",
  NON_LAGOS_DESTINATION: "Doesn't land in Lagos",
  FLIGHT_NOT_FOUND: "Flight not found",
  INVALID_FLIGHT_NUMBER: "Invalid flight number",
};

const UNBOOKABLE_FLIGHT_SEARCH_CODES = new Set([
  "NON_LAGOS_DESTINATION",
  "FLIGHT_NOT_FOUND",
  "FLIGHT_ALREADY_LANDED",
  "INVALID_FLIGHT_NUMBER",
  "VALIDATION_ERROR",
]);

export function flightSearchValidationFromError(
  error: unknown,
): FlightSearchValidation {
  const message = getFlightSearchErrorMessage(error);
  const code = error instanceof ApiError ? error.code : undefined;
  return {
    flight: null,
    message,
    shortMessage: shortMessageForFlightError(code, message),
    unbookable: code !== undefined && UNBOOKABLE_FLIGHT_SEARCH_CODES.has(code),
  };
}

function shortMessageForFlightError(
  code: string | undefined,
  fallback: string,
): string {
  if (code && FLIGHT_SEARCH_SHORT_ERROR[code]) {
    return FLIGHT_SEARCH_SHORT_ERROR[code];
  }
  return fallback.length > 48 ? `${fallback.slice(0, 45)}…` : fallback;
}
