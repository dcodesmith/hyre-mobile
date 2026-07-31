import dayjs from "dayjs";

import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
  DAY_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
} from "./booking-types";

function hasPassedCutoff(now: Date, cutoffHour: number): boolean {
  if (now.getHours() > cutoffHour) {
    return true;
  }
  return now.getHours() === cutoffHour && now.getMinutes() > 0;
}

/**
 * Calculates the minimum selectable "From" date based on booking type windows.
 * - DAY: same-day bookings allowed until 11:00 AM (inclusive), then next day
 * - FULL_DAY: same-day bookings allowed until 11:00 PM (inclusive), then next day
 * - Others: same-day allowed
 */
export function getFromDateMinDate(
  bookingType: BookingType,
  now: Date = new Date(),
): Date {
  const base = dayjs(now).startOf("day");
  if (bookingType === DAY_BOOKING_TYPE && hasPassedCutoff(now, 11)) {
    return base.add(1, "day").toDate();
  }

  if (bookingType === FULL_DAY_BOOKING_TYPE && hasPassedCutoff(now, 23)) {
    return base.add(1, "day").toDate();
  }

  return base.toDate();
}

/**
 * Validates that the "to" date selection is valid for the given booking type.
 * For NIGHT and FULL_DAY bookings, the start and end dates must be different (not same day).
 */
export function isValidToDateSelection(
  bookingType: BookingType,
  fromDate: Date | undefined,
  toDate: Date | undefined,
): boolean {
  if (
    (bookingType === NIGHT_BOOKING_TYPE ||
      bookingType === FULL_DAY_BOOKING_TYPE) &&
    fromDate &&
    toDate
  ) {
    const startDay = dayjs(fromDate).startOf("day");
    const endDay = dayjs(toDate).startOf("day");

    if (startDay.isSame(endDay)) {
      return false;
    }
  }

  return true;
}

function requiresOvernightSpan(bookingType: BookingType): boolean {
  return (
    bookingType === NIGHT_BOOKING_TYPE || bookingType === FULL_DAY_BOOKING_TYPE
  );
}

/**
 * Calculates the minimum selectable date for the "To" date picker.
 * For NIGHT and FULL_DAY bookings, prevents same-day selection by requiring at least 1 day after "from".
 * When From is empty, uses the earliest valid To for a derived From.
 */
export function getToDateMinDate(
  bookingType: BookingType,
  fromDate: Date | undefined,
  now: Date = new Date(),
): Date {
  if (!fromDate) {
    const fromMin = dayjs(getFromDateMinDate(bookingType, now)).startOf("day");
    if (requiresOvernightSpan(bookingType)) {
      return fromMin.add(1, "day").toDate();
    }
    return fromMin.toDate();
  }

  if (requiresOvernightSpan(bookingType)) {
    return dayjs(fromDate).startOf("day").add(1, "day").toDate();
  }

  return fromDate;
}

/**
 * Resolves From/To when the user picks a To date.
 * - DAY: To-first sets From = To
 * - NIGHT / FULL_DAY: To-first sets From = To − 1 day (clamped to min From)
 * Returns null when an existing From makes the To selection invalid.
 */
export function resolveDateRangeOnToChange(
  bookingType: BookingType,
  fromDate: Date | undefined,
  toDate: Date | undefined,
  now: Date = new Date(),
): { from?: Date; to?: Date } | null {
  if (!toDate) {
    return { from: fromDate, to: undefined };
  }

  if (fromDate && !isValidToDateSelection(bookingType, fromDate, toDate)) {
    return null;
  }

  if (fromDate) {
    return { from: fromDate, to: toDate };
  }

  const to = dayjs(toDate).startOf("day");
  const fromMin = dayjs(getFromDateMinDate(bookingType, now)).startOf("day");

  if (requiresOvernightSpan(bookingType)) {
    let from = to.subtract(1, "day");
    if (from.isBefore(fromMin)) {
      from = fromMin;
    }
    const nextTo = to.isAfter(from) ? to : from.add(1, "day");
    return { from: from.toDate(), to: nextTo.toDate() };
  }

  const from = to.isBefore(fromMin) ? fromMin : to;
  return { from: from.toDate(), to: from.toDate() };
}

/**
 * When pickup time is chosen with no dates, fill a valid default range.
 * - DAY: From = To = earliest From
 * - NIGHT / FULL_DAY: From = earliest From, To = From + 1 day
 * Returns null when dates already exist or booking type has no pickup time.
 */
export function ensureDateRangeForPickupTime(
  bookingType: BookingType,
  fromDate: Date | undefined,
  toDate: Date | undefined,
  now: Date = new Date(),
): { from: Date; to: Date } | null {
  if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
    return null;
  }
  if (fromDate || toDate) {
    return null;
  }

  const from = getFromDateMinDate(bookingType, now);
  if (requiresOvernightSpan(bookingType)) {
    return { from, to: dayjs(from).startOf("day").add(1, "day").toDate() };
  }
  return { from, to: from };
}

/**
 * Calculates the number of booking units (days/nights) for a given date range and booking type.
 *
 * @param from - Start date (Date or undefined)
 * @param to - End date (Date or undefined)
 * @param bookingType - Type of booking (DAY, NIGHT, FULL_DAY, or AIRPORT_PICKUP)
 * @returns Number of booking units (minimum 1)
 */
export function calculateBookingUnits(
  from: Date | undefined,
  to: Date | undefined,
  bookingType?: BookingType,
): number {
  if (!from || !to) {
    return 1;
  }

  const fromDate = dayjs(from).startOf("day");
  const toDate = dayjs(to).startOf("day");

  // Validate that from is not after to
  if (fromDate.isAfter(toDate)) {
    return 1;
  }

  const differenceInDays = toDate.diff(fromDate, "day");

  // For NIGHT bookings: number of nights = difference in calendar days
  // Oct 26 to Oct 27 = 1 night
  if (bookingType === NIGHT_BOOKING_TYPE) {
    return Math.max(1, differenceInDays);
  }

  // For FULL_DAY bookings: number of 24-hour periods = difference in calendar days
  // Oct 26 to Oct 27 = 1 full day
  if (bookingType === FULL_DAY_BOOKING_TYPE) {
    return Math.max(1, differenceInDays);
  }

  // For DAY bookings: include both start and end dates
  // Oct 26 to Oct 26 = 1 day
  // Oct 26 to Oct 27 = 2 days
  if (bookingType === DAY_BOOKING_TYPE) {
    return Math.max(1, differenceInDays + 1);
  }

  // For AIRPORT_PICKUP bookings: always 1 unit (one-way trip)
  if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
    return 1;
  }

  // Default fallback (assume DAY booking)
  return 1;
}

type BookingWindowInput = {
  bookingType: BookingType;
  startDate: Date;
  endDate: Date;
  pickupTime?: string;
};

/**
 * Mirrors worker `normalizeBookingTimeWindow` so submitted booking payloads align
 * with server-side leg generation and validation windows.
 */
export function normalizeBookingTimeWindow(input: BookingWindowInput): {
  startDate: Date;
  endDate: Date;
} {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const pickupTime =
    input.pickupTime ?? getDefaultPickupTime(input.bookingType);

  if (input.bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
    return { startDate, endDate };
  }

  if (input.bookingType === NIGHT_BOOKING_TYPE) {
    startDate.setHours(23, 0, 0, 0);
    endDate.setHours(5, 0, 0, 0);
    if (endDate.getTime() <= startDate.getTime()) {
      endDate.setDate(endDate.getDate() + 1);
    }
    return { startDate, endDate };
  }

  if (input.bookingType === FULL_DAY_BOOKING_TYPE) {
    parseAndApplyPickupTime(startDate, pickupTime);
    const daySpan = Math.max(
      1,
      dayjs(endDate)
        .startOf("day")
        .diff(dayjs(input.startDate).startOf("day"), "day"),
    );
    return {
      startDate,
      endDate: dayjs(startDate)
        .add(24 * daySpan, "hour")
        .toDate(),
    };
  }

  parseAndApplyPickupTime(startDate, pickupTime);
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setHours(
    startDate.getHours() + 12,
    startDate.getMinutes(),
    0,
    0,
  );
  return { startDate, endDate: adjustedEndDate };
}

function getDefaultPickupTime(bookingType: BookingType): string {
  switch (bookingType) {
    case DAY_BOOKING_TYPE:
      return "7:00 AM";
    case FULL_DAY_BOOKING_TYPE:
      return "6:00 AM";
    default:
      return "9:00 AM";
  }
}

function parseAndApplyPickupTime(date: Date, pickupTime: string): void {
  const time24Match = /^(\d{1,2}):(\d{2})$/.exec(pickupTime);
  if (time24Match) {
    const hours = Number.parseInt(time24Match[1], 10);
    const minutes = Number.parseInt(time24Match[2], 10);
    date.setHours(hours, minutes, 0, 0);
    return;
  }

  const time12Match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(pickupTime);

  if (!time12Match) {
    return;
  }

  let hours = Number.parseInt(time12Match[1], 10);
  const minutes = time12Match[2] ? Number.parseInt(time12Match[2], 10) : 0;
  const period = time12Match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  date.setHours(hours, minutes, 0, 0);
}

/**
 * Fuel policy copy — aligned with hireApp `getFuelTankNote` for booking card parity.
 */
export function getFuelTankNote(
  totalDays: number,
  requiresFullTank = false,
  bookingType?: BookingType,
  pricingIncludesFuel?: boolean,
): string | null {
  if (totalDays <= 0) {
    return null;
  }

  if (pricingIncludesFuel) {
    return null;
  }

  let note: string | null = null;

  if (bookingType === FULL_DAY_BOOKING_TYPE) {
    note = "24-hour booking comes with a full tank";
  } else if (bookingType === NIGHT_BOOKING_TYPE) {
    note = "Night booking comes with 1/3rd of a tank";
  } else if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
    note = "Airport pickup comes with a full tank";
  } else if (requiresFullTank && totalDays <= 2) {
    note = "Booking comes with a full tank";
  } else if (totalDays === 1) {
    note = "Booking comes with 1/3rd of a tank";
  } else if (totalDays === 2) {
    note = "Booking comes with 2/3rd of a tank";
  } else if (totalDays >= 3) {
    note = "Booking comes with a full tank";
  }

  return note
    ? `${note}, after which, it's your responsibility to fill the tank.`
    : null;
}
