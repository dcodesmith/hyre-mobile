import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
  DAY_BOOKING_TYPE,
  TAB_VALUE_TO_BOOKING_TYPE,
} from "@/lib/booking-types";
import {
  ensureDateRangeForPickupTime,
  getFromDateMinDate,
  getToDateMinDate,
  resolveDateRangeOnToChange,
} from "@/lib/booking-utils";
import { bookingCheckoutDetailsSchema } from "@/lib/validations/booking";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useCallback, useMemo } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import type { z } from "zod";

export type CarBookingFormValues = z.input<typeof bookingCheckoutDetailsSchema>;

/**
 * URL-query seed used to pre-populate the booking form when users deep-link
 * into the car detail screen (e.g. after sign-in redirect or from search).
 */
export type CarBookingFormSeed = {
  bookingType?: string;
  from?: string;
  to?: string;
  pickupTime?: string;
  flightNumber?: string;
  pickupAddress?: string | string[];
  dropOffAddress?: string | string[];
  sameLocation?: string | string[];
};

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toInitialValues(seed: CarBookingFormSeed): CarBookingFormValues {
  const bookingType = (seed.bookingType as BookingType) || DAY_BOOKING_TYPE;
  const isAirport = bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  return {
    bookingType,
    from: seed.from ? dayjs(seed.from).toDate() : undefined,
    to: seed.to ? dayjs(seed.to).toDate() : undefined,
    pickupTime: seed.pickupTime,
    flightNumber: seed.flightNumber,
    pickupAddress: pickFirst(seed.pickupAddress) ?? "",
    dropOffAddress: pickFirst(seed.dropOffAddress) ?? "",
    sameLocation: isAirport
      ? false
      : pickFirst(seed.sameLocation) !== "false",
  };
}

export type CarBookingFormReturn = {
  form: UseFormReturn<CarBookingFormValues>;
  values: {
    bookingType: BookingType;
    fromDate: Date | undefined;
    toDate: Date | undefined;
    dateRange: { from?: Date; to?: Date };
    pickupTime: string | undefined;
    flightNumber: string | undefined;
    pickupAddress: string;
    dropOffAddress: string | undefined;
    sameLocation: boolean;
    isAirport: boolean;
  };
  constraints: {
    fromDateMinDate: Date;
    toDateMinDate: Date;
  };
  handlers: {
    handleBookingTypeChange: (tabValue: string) => void;
    handleFromDateChange: (date: Date | null) => void;
    handleToDateChange: (date: Date | null) => void;
    handlePickupTimeChange: (value: string) => void;
    handleFlightNumberChange: (value: string) => void;
  };
};

/**
 * Encapsulates the booking RHF instance for the car detail screen: default
 * values seeded from URL params, watched values, and the date/booking-type
 * handlers that enforce cross-field rules (min dates, type resets).
 */
export function useCarBookingForm(
  seed: CarBookingFormSeed,
): CarBookingFormReturn {
  const form = useForm<CarBookingFormValues>({
    resolver: zodResolver(bookingCheckoutDetailsSchema),
    defaultValues: toInitialValues(seed),
    reValidateMode: "onChange",
  });
  const { watch, setValue } = form;

  const bookingType = watch("bookingType");
  const fromDate = watch("from");
  const toDate = watch("to");
  const pickupTime = watch("pickupTime");
  const flightNumber = watch("flightNumber");
  const pickupAddress = watch("pickupAddress");
  const dropOffAddress = watch("dropOffAddress");
  const sameLocation = watch("sameLocation");

  const dateRange = useMemo(
    () => ({ from: fromDate, to: toDate }),
    [fromDate, toDate],
  );

  const fromDateMinDate = useMemo(
    () => getFromDateMinDate(bookingType),
    [bookingType],
  );
  const toDateMinDate = useMemo(
    () => getToDateMinDate(bookingType, fromDate),
    [bookingType, fromDate],
  );

  const handleBookingTypeChange = useCallback(
    (tabValue: string) => {
      const newBookingType = TAB_VALUE_TO_BOOKING_TYPE[tabValue];
      if (!newBookingType) return;

      // hireApp useBookingCard: reset dates, addresses, flight, and flags on type change.
      setValue("bookingType", newBookingType, { shouldValidate: true });
      setValue("from", undefined, { shouldValidate: false });
      setValue("to", undefined, { shouldValidate: false });
      setValue("pickupTime", undefined, { shouldValidate: false });
      setValue("flightNumber", undefined, { shouldValidate: false });
      setValue("pickupAddress", "", { shouldValidate: false });
      setValue("dropOffAddress", "", { shouldValidate: false });
      setValue(
        "sameLocation",
        newBookingType === AIRPORT_PICKUP_BOOKING_TYPE ? false : true,
        { shouldValidate: false },
      );
      form.clearErrors();
    },
    [setValue, form],
  );

  const handleFromDateChange = useCallback(
    (date: Date | null) => {
      let next: Date | undefined;
      if (date) {
        const selected = dayjs(date).startOf("day");
        const min = dayjs(fromDateMinDate).startOf("day");
        next = selected.isBefore(min) ? fromDateMinDate : date;
      }

      let nextTo: Date | undefined;

      if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
        nextTo = next;
      } else if (toDate && next && toDate < next) {
        nextTo = undefined;
      } else {
        nextTo = toDate;
      }

      setValue("from", next, { shouldValidate: true });
      setValue("to", nextTo, { shouldValidate: true });
      if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
        setValue("pickupTime", undefined, { shouldValidate: false });
      }
    },
    [bookingType, toDate, fromDateMinDate, setValue],
  );

  const handleToDateChange = useCallback(
    (date: Date | null) => {
      const next = resolveDateRangeOnToChange(
        bookingType,
        fromDate,
        date ?? undefined,
      );
      if (!next) return;
      setValue("from", next.from, { shouldValidate: true });
      setValue("to", next.to, { shouldValidate: true });
    },
    [bookingType, fromDate, setValue],
  );

  const handlePickupTimeChange = useCallback(
    (value: string) => {
      const filled = ensureDateRangeForPickupTime(
        bookingType,
        fromDate,
        toDate,
      );
      if (filled) {
        setValue("from", filled.from, { shouldValidate: true });
        setValue("to", filled.to, { shouldValidate: true });
      }
      setValue("pickupTime", value, { shouldValidate: true });
    },
    [bookingType, fromDate, toDate, setValue],
  );

  const handleFlightNumberChange = useCallback(
    (value: string) => {
      setValue("flightNumber", value, { shouldValidate: true });
      setValue("pickupTime", undefined, { shouldValidate: false });
    },
    [setValue],
  );

  return {
    form,
    values: {
      bookingType,
      fromDate,
      toDate,
      dateRange,
      pickupTime,
      flightNumber,
      pickupAddress,
      dropOffAddress,
      sameLocation,
      isAirport: bookingType === AIRPORT_PICKUP_BOOKING_TYPE,
    },
    constraints: {
      fromDateMinDate,
      toDateMinDate,
    },
    handlers: {
      handleBookingTypeChange,
      handleFromDateChange,
      handleToDateChange,
      handlePickupTimeChange,
      handleFlightNumberChange,
    },
  };
}
