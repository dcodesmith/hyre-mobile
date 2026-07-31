import type { ValidatedFlight } from "@/services/flights";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const LAGOS_TIMEZONE = "Africa/Lagos";

/** Matches worker `AIRPORT_PICKUP_BUFFER_MINUTES`. */
export const AIRPORT_PICKUP_BUFFER_MINUTES = 40;

/** Matches worker `AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER`. */
export const AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER = 1.2;

export const UNBOOKABLE_FLIGHT_ERROR_CODES = new Set([
  "NON_LAGOS_DESTINATION",
  "FLIGHT_NOT_FOUND",
  "FLIGHT_ALREADY_LANDED",
  "INVALID_FLIGHT_NUMBER",
  "VALIDATION_ERROR",
]);

export function normalizeFlightNumber(
  value: string | null | undefined,
): string {
  return (value ?? "").trim().toUpperCase().replaceAll(/\s+/g, "");
}

export function composeAirportPickupAddress(flight: ValidatedFlight): string {
  const name = flight.destinationName?.trim();
  const city = flight.destinationCity?.trim();
  if (name && city) return `${name}, ${city}`;
  if (name) return name;
  if (city) return city;
  return (
    flight.destinationIATA?.trim() ||
    flight.destination?.trim() ||
    "Lagos Airport"
  );
}

export function getFlightArrivalTime(flight: ValidatedFlight): Date {
  const raw =
    flight.actualArrival ??
    flight.estimatedArrival ??
    flight.scheduledArrival;
  return new Date(raw);
}

/** hireApp compact search: `LHR → LOS • 6:45 PM` (Lagos local). */
export function formatFlightSearchInlineSuccess(
  flight: ValidatedFlight,
): string {
  const origin = flight.originIATA?.trim() || flight.origin.trim();
  const destination =
    flight.destinationIATA?.trim() || flight.destination.trim();
  const arrivalTime = formatInTimeZone(
    getFlightArrivalTime(flight),
    LAGOS_TIMEZONE,
    "h:mm a",
  ).replace(/\s+/g, " ");
  return `${origin} → ${destination} • ${arrivalTime}`;
}

export type AirportPickupWindow = {
  /** Pickup datetime (arrival + buffer) — send as booking startDate. */
  startDate: Date;
  /** Drop-off datetime — send as booking endDate. */
  endDate: Date;
  /** Calendar day of pickup in Lagos (for date pickers / URL). */
  fromDate: Date;
  /** Calendar day of drop-off in Lagos. */
  toDate: Date;
  /** e.g. "3:10 PM" for Nest pickupTime DTO. */
  pickupTime: string;
};

/**
 * Derive the airport booking window from flight arrival + drive time.
 * Mirrors hireApp / worker: pickup = arrival + 40m, end = pickup + drive×1.2.
 */
export function deriveAirportPickupWindow(
  arrivalTime: Date,
  driveTimeMinutes: number,
): AirportPickupWindow {
  const startDate = new Date(
    arrivalTime.getTime() + AIRPORT_PICKUP_BUFFER_MINUTES * 60 * 1000,
  );
  const bufferedDriveMinutes = Math.ceil(
    driveTimeMinutes * AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER,
  );
  const endDate = new Date(
    startDate.getTime() + bufferedDriveMinutes * 60 * 1000,
  );

  const pickupDateOnly = formatInTimeZone(
    startDate,
    LAGOS_TIMEZONE,
    "yyyy-MM-dd",
  );
  const dropOffDateOnly = formatInTimeZone(
    endDate,
    LAGOS_TIMEZONE,
    "yyyy-MM-dd",
  );
  const pickupTime = formatInTimeZone(
    startDate,
    LAGOS_TIMEZONE,
    "h:mm a",
  ).replace(/\s+/g, " ");

  return {
    startDate,
    endDate,
    fromDate: fromZonedTime(`${pickupDateOnly}T00:00:00`, LAGOS_TIMEZONE),
    toDate: fromZonedTime(`${dropOffDateOnly}T00:00:00`, LAGOS_TIMEZONE),
    pickupTime,
  };
}

export type AirportTripEstimation = {
  readonly durationMinutes: number;
  readonly distanceMeters: number;
  readonly isEstimate: boolean;
  readonly estimatedArrivalIso: string;
};

export function isUnbookableFlightErrorCode(
  code: string | undefined,
): boolean {
  return typeof code === "string" && UNBOOKABLE_FLIGHT_ERROR_CODES.has(code);
}

export function formatAirportTripDistanceMeters(meters: number): string {
  if (meters <= 0) return "—";
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatBufferedDriveDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours > 1 ? "s" : ""} ${remaining} mins`;
}
