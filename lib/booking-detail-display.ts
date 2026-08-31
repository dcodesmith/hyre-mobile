import type { BookingType } from "@/lib/booking-types";
import { format, toZonedTime } from "date-fns-tz";

const LAGOS_TIMEZONE = "Africa/Lagos";

export const toLagosTime = (value: string | Date) =>
  toZonedTime(new Date(value), LAGOS_TIMEZONE);

export const formatBookingDate = (value: string | null | undefined) =>
  value ? format(toLagosTime(value), "PPP") : "TBD";

export const formatBookingTime = (value: string | null | undefined) =>
  value ? format(toLagosTime(value), "h:mm a") : "TBD";

export const bookingStatusPillClass = (status: string) => {
  if (status === "CANCELLED") return "bg-red-100 text-red-800 border-red-200";
  if (status === "COMPLETED")
    return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-green-100 text-green-800 border-green-200";
};

export const paymentStatusPillClass = (status: string) => {
  if (status === "PAID")
    return "bg-green-100 text-green-800 border-green-200";
  if (status === "REFUNDED")
    return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-yellow-100 text-yellow-800 border-yellow-200";
};

export const bookingTypeDescription = (type: BookingType) => {
  if (type === "DAY") {
    return "Each booking day is for a 12-hour duration ending 12 hours after the start time unless extended.";
  }
  if (type === "NIGHT") {
    return "Each night booking is for a 6-hour duration starting at 11pm.";
  }
  if (type === "AIRPORT_PICKUP") {
    return "Each airport pickup booking is for a one-way trip from the airport.";
  }
  return "Each full day booking is for a 24-hour duration ending 24 hours after the pickup time.";
};
