import type { CarBookingFormReturn } from "@/hooks/use-car-booking-form";
import { useAirportTripDuration } from "@/hooks/use-airport-trip-duration";
import { useFlightSearch } from "@/hooks/use-flight-search";
import {
  composeAirportPickupAddress,
  deriveAirportPickupWindow,
  getFlightArrivalTime,
  normalizeFlightNumber,
  type AirportTripEstimation,
} from "@/lib/airport-pickup";
import { AIRPORT_PICKUP_BOOKING_TYPE } from "@/lib/booking-types";
import { getFlightSearchErrorMessage } from "@/services/flights";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";

type UseAirportPickupBookingArgs = {
  booking: CarBookingFormReturn;
};

export type UseAirportPickupBookingReturn = {
  flightError: string | null;
  isValidatingFlight: boolean;
  isCalculatingDuration: boolean;
  hasValidatedFlight: boolean;
  tripEstimation: AirportTripEstimation | null;
  handleDropOffAddressSelected: (address: string) => Promise<void>;
};

/**
 * Airport pickup on car detail: Query-backed flight validation, form autofill,
 * and drop-off → booking-window derivation.
 */
export function useAirportPickupBooking(
  args: UseAirportPickupBookingArgs,
): UseAirportPickupBookingReturn {
  const { booking } = args;
  const { values, form } = booking;
  const { setValue } = form;

  const isAirport = values.bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  const flightNumber = normalizeFlightNumber(values.flightNumber);
  const fromKey = values.fromDate
    ? dayjs(values.fromDate).format("YYYY-MM-DD")
    : "";
  const hasDerivedWindow = Boolean(values.pickupTime?.trim());

  // Freeze search date once the window is derived so overnight from/to edits
  // don't change the query key and drop cached flight data.
  const searchDateRef = useRef("");
  if (!hasDerivedWindow && fromKey) {
    searchDateRef.current = fromKey;
  }
  if (!flightNumber) {
    searchDateRef.current = "";
  }
  const searchDate = searchDateRef.current;

  const flightQuery = useFlightSearch({
    flightNumber,
    date: searchDate,
    // Wait for digits so airline-code-only autocomplete picks don't hit the API.
    enabled: isAirport && !hasDerivedWindow && /\d/.test(flightNumber),
  });

  const { mutateAsync: fetchTripDuration, isPending: isCalculatingDuration } =
    useAirportTripDuration();
  const validatedFlight = flightQuery.data?.flight ?? null;
  const autofilledFlightIdRef = useRef<string | null>(null);
  const [tripEstimation, setTripEstimation] =
    useState<AirportTripEstimation | null>(null);

  useEffect(() => {
    if (!isAirport || !validatedFlight) {
      setTripEstimation(null);
    }
  }, [isAirport, validatedFlight]);

  const applyWindowForDropOff = useCallback(
    async (address: string) => {
      const flight = validatedFlight;
      if (!isAirport || !flight) return;

      const trimmed = address.trim();
      if (!trimmed) {
        setTripEstimation(null);
        setValue("pickupTime", undefined, { shouldValidate: false });
        return;
      }

      try {
        const duration = await fetchTripDuration(trimmed);
        const arrivalTime = getFlightArrivalTime(flight);
        const window = deriveAirportPickupWindow(
          arrivalTime,
          duration.durationMinutes,
        );
        setTripEstimation({
          durationMinutes: duration.durationMinutes,
          distanceMeters: duration.distanceMeters,
          isEstimate: duration.isEstimate,
          estimatedArrivalIso: arrivalTime.toISOString(),
        });
        setValue("from", window.startDate, { shouldValidate: false });
        setValue("to", window.endDate, { shouldValidate: false });
        setValue("pickupTime", window.pickupTime, { shouldValidate: false });
        form.clearErrors("dropOffAddress");
      } catch {
        setTripEstimation(null);
        setValue("pickupTime", undefined, { shouldValidate: false });
      }
    },
    [isAirport, validatedFlight, setValue, fetchTripDuration, form],
  );

  // Form sync only: write pickup address when a new flight resolves.
  useEffect(() => {
    if (!isAirport || !validatedFlight) {
      autofilledFlightIdRef.current = null;
      return;
    }
    if (autofilledFlightIdRef.current === validatedFlight.flightId) return;

    autofilledFlightIdRef.current = validatedFlight.flightId;
    setValue("pickupAddress", composeAirportPickupAddress(validatedFlight), {
      shouldValidate: true,
    });
    setValue("sameLocation", false, { shouldValidate: true });

    const existingDropOff = values.dropOffAddress?.trim();
    if (existingDropOff) {
      (async () => {
        try {
          await applyWindowForDropOff(existingDropOff);
        } catch {
          // applyWindowForDropOff already clears pickupTime on failure
        }
      })();
    }
  }, [
    isAirport,
    validatedFlight,
    setValue,
    values.dropOffAddress,
    applyWindowForDropOff,
  ]);

  return {
    flightError: flightQuery.isError
      ? getFlightSearchErrorMessage(flightQuery.error)
      : null,
    isValidatingFlight: flightQuery.isFetching,
    isCalculatingDuration,
    hasValidatedFlight: validatedFlight != null,
    tripEstimation,
    handleDropOffAddressSelected: applyWindowForDropOff,
  };
}
