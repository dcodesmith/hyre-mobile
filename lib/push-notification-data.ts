import { z } from "zod";

export const PUSH_NOTIFICATION_TYPES = [
  "booking-status-change",
  "booking-reminder-start",
  "booking-reminder-end",
  "booking-confirmed",
  "chauffeur-assigned",
  "booking-cancelled",
  "booking-extension-confirmed",
  "booking-updated",
  "fleet-owner-new-booking",
  "review-received",
  "referral-reward-released",
  "payout-status-changed",
  "refund-status-changed",
  "flight-arrived",
  "flight-departed",
  "flight-delayed",
  "flight-cancelled",
  "flight-diverted",
  "flight-gate-changed",
  "flight-terminal-changed",
  "flight-delay-recovered",
  "flight-reinstated",
  "flight-assignment-snapshot",
] as const;

const bookingTargetSchema = z
  .object({
    kind: z.literal("booking"),
    bookingId: z.string().min(1),
  })
  .strict();

const referralsTargetSchema = z
  .object({
    kind: z.literal("referrals"),
  })
  .strict();

const typedPushNotificationDataSchema = z
  .object({
    type: z.enum(PUSH_NOTIFICATION_TYPES),
    target: z.discriminatedUnion("kind", [
      bookingTargetSchema,
      referralsTargetSchema,
    ]),
  })
  .strict();

export type PushNotificationData = z.infer<
  typeof typedPushNotificationDataSchema
>;

export type PushNotificationRoute =
  | {
      pathname: "/bookings/[id]";
      params: { id: string };
    }
  | {
      pathname: "/(tabs)/referrals";
    };

export const parsePushNotificationData = (
  data: unknown,
): PushNotificationData | null => {
  const result = typedPushNotificationDataSchema.safeParse(data);
  return result.success ? result.data : null;
};

export const getPushNotificationRoute = (
  data: PushNotificationData,
): PushNotificationRoute =>
  data.target.kind === "booking"
    ? {
        pathname: "/bookings/[id]",
        params: { id: data.target.bookingId },
      }
    : {
        pathname: "/(tabs)/referrals",
      };
