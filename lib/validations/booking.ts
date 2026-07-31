import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
  DAY_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
} from "@/lib/booking-types";
import { z } from "zod";

export const guestCheckoutFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Invalid email address",
    }),
  phoneNumber: z.string().trim().min(1, "Phone number is required"),
});

export type GuestCheckoutFormValues = z.infer<typeof guestCheckoutFormSchema>;

const pickupTimeRegex = /^(1[0-2]|[1-9])(:[0-5]\d)?\s?(AM|PM)$/i;

export const bookingCheckoutDetailsSchema = z
  .object({
    bookingType: z.enum([
      DAY_BOOKING_TYPE,
      NIGHT_BOOKING_TYPE,
      FULL_DAY_BOOKING_TYPE,
      AIRPORT_PICKUP_BOOKING_TYPE,
    ] as [BookingType, ...BookingType[]]),
    from: z.date().optional(),
    to: z.date().optional(),
    pickupAddress: z.string().trim().min(1, "Please enter a pickup address"),
    dropOffAddress: z.string().trim().optional(),
    sameLocation: z.boolean(),
    pickupTime: z.string().trim().optional(),
    flightNumber: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.from) {
      ctx.addIssue({
        code: "custom",
        message: "Please select booking dates",
        path: ["from"],
      });
    }
    if (!data.to) {
      ctx.addIssue({
        code: "custom",
        message: "Please select booking dates",
        path: ["to"],
      });
    }

    // Date-range comparison is the only check that requires both dates.
    // Pickup time / flight number / drop-off address checks must still run
    // so all field-level errors surface together on submit.
    if (data.from && data.to && data.to.getTime() < data.from.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "Drop-off date cannot be earlier than pickup date",
        path: ["to"],
      });
    }

    if (
      (data.bookingType === DAY_BOOKING_TYPE ||
        data.bookingType === FULL_DAY_BOOKING_TYPE) &&
      (!data.pickupTime || !pickupTimeRegex.test(data.pickupTime))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Please select a pickup time",
        path: ["pickupTime"],
      });
    }

    if (
      data.bookingType === AIRPORT_PICKUP_BOOKING_TYPE &&
      (!data.flightNumber || data.flightNumber.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Please enter a flight number",
        path: ["flightNumber"],
      });
    }

    const sameLocationPayload =
      data.bookingType === AIRPORT_PICKUP_BOOKING_TYPE
        ? false
        : data.sameLocation;
    const hasDropOff =
      typeof data.dropOffAddress === "string" &&
      data.dropOffAddress.trim().length > 0;

    if (data.bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
      // Only when drop-off is empty — never when an address is already selected
      // (pickup window derivation is async and must not paint a false error).
      if (!hasDropOff) {
        ctx.addIssue({
          code: "custom",
          message: "Select a drop-off address to confirm your pickup window",
          path: ["dropOffAddress"],
        });
      }
    } else if (!sameLocationPayload && !hasDropOff) {
      ctx.addIssue({
        code: "custom",
        message: "Please enter a drop-off address",
        path: ["dropOffAddress"],
      });
    }
  });

export type BookingCheckoutDetailsValues = z.infer<
  typeof bookingCheckoutDetailsSchema
>;
