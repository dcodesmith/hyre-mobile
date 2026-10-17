import type { BookingType } from "@/lib/booking-types";
import { format, toZonedTime } from "date-fns-tz";

const LAGOS_TIMEZONE = "Africa/Lagos";

export const toLagosTime = (value: string | Date) =>
  toZonedTime(new Date(value), LAGOS_TIMEZONE);

export const formatBookingDate = (value: string | null | undefined) =>
  value ? format(toLagosTime(value), "PPP") : "TBD";

export const formatBookingTime = (value: string | null | undefined) =>
  value ? format(toLagosTime(value), "h:mm a") : "TBD";

type StatusPill = {
  readonly container: string;
  readonly text: string;
  readonly dot: string;
};

const SLATE_PILL = {
  container: "border-slate-500/20 bg-slate-50",
  text: "text-slate-700",
  dot: "bg-slate-500",
} as const satisfies StatusPill;

const AMBER_PILL = {
  container: "border-amber-600/20 bg-amber-50",
  text: "text-amber-800",
  dot: "bg-amber-500",
} as const satisfies StatusPill;

const EMERALD_PILL = {
  container: "border-emerald-600/20 bg-emerald-50",
  text: "text-emerald-700",
  dot: "bg-emerald-500",
} as const satisfies StatusPill;

const BLUE_PILL = {
  container: "border-blue-600/20 bg-blue-50",
  text: "text-blue-700",
  dot: "bg-blue-500",
} as const satisfies StatusPill;

const RED_PILL = {
  container: "border-red-600/20 bg-red-50",
  text: "text-red-700",
  dot: "bg-red-500",
} as const satisfies StatusPill;

const BOOKING_STATUS_PILL = {
  PENDING: AMBER_PILL,
  CONFIRMED: EMERALD_PILL,
  ACTIVE: BLUE_PILL,
  COMPLETED: SLATE_PILL,
  CANCELLED: RED_PILL,
  REJECTED: RED_PILL,
} as const satisfies Record<string, StatusPill>;

const PAYMENT_STATUS_PILL = {
  UNPAID: AMBER_PILL,
  PAID: EMERALD_PILL,
  REFUNDED: BLUE_PILL,
  PARTIALLY_REFUNDED: BLUE_PILL,
  REFUND_PROCESSING: AMBER_PILL,
  REFUND_FAILED: RED_PILL,
} as const satisfies Record<string, StatusPill>;

export const bookingStatusPill = (status: string): StatusPill =>
  status in BOOKING_STATUS_PILL
    ? BOOKING_STATUS_PILL[status as keyof typeof BOOKING_STATUS_PILL]
    : SLATE_PILL;

export const paymentStatusPill = (status: string): StatusPill =>
  status in PAYMENT_STATUS_PILL
    ? PAYMENT_STATUS_PILL[status as keyof typeof PAYMENT_STATUS_PILL]
    : AMBER_PILL;

export const statusLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

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
