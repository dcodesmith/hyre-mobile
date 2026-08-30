import { BookingDetailSectionTitle } from "@/components/booking-detail-section-title";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  DAY_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
  type BookingType,
} from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import type { BookingDetail } from "@/services/bookings";
import { format, toZonedTime } from "date-fns-tz";
import { Calendar } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

const LAGOS_TIMEZONE = "Africa/Lagos";

const toLagosTime = (value: string | Date) =>
  toZonedTime(new Date(value), LAGOS_TIMEZONE);

type LegStatus = {
  text: string;
  badgeClassName: string;
};

function getLegStatus(
  bookingStatus: BookingDetail["status"],
  legStart: Date,
  legEnd: Date,
): LegStatus {
  if (bookingStatus === "CANCELLED") {
    return {
      text: "Cancelled",
      badgeClassName: "bg-red-50 text-red-700 border-red-200",
    };
  }
  if (bookingStatus === "COMPLETED") {
    return {
      text: "Completed",
      badgeClassName: "bg-green-50 text-green-700 border-green-200",
    };
  }

  const now = new Date();
  if (now >= legStart && now < legEnd) {
    return {
      text: "Active",
      badgeClassName: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  if (now >= legEnd) {
    return {
      text: "Completed",
      badgeClassName: "bg-green-50 text-green-700 border-green-200",
    };
  }
  return {
    text: "Upcoming",
    badgeClassName: "bg-slate-50 text-slate-700 border-slate-200",
  };
}

function getServiceTypeText(type: BookingType): string {
  if (type === FULL_DAY_BOOKING_TYPE) return "Standard 24-hour service";
  if (type === NIGHT_BOOKING_TYPE) return "Standard 6-hour service";
  if (type === AIRPORT_PICKUP_BOOKING_TYPE) return "Airport pickup service";
  return "Standard 12-hour service";
}

function formatTimelinePickupTime(type: BookingType, value: string): string {
  const date = toLagosTime(value);
  return type === FULL_DAY_BOOKING_TYPE
    ? format(date, "h:mm a - MMM do")
    : format(date, "h:mm a");
}

function formatTimelineDropoffTime(
  type: BookingType,
  value: string,
  extendedHours: number,
): string {
  const date = toLagosTime(value);
  const base =
    type === FULL_DAY_BOOKING_TYPE
      ? format(date, "h:mm a - MMM do")
      : format(date, "h:mm a");
  return extendedHours > 0 ? `${base} (Extended)` : base;
}

function BookingLegTimelineRow({
  label,
  value,
  isStarted,
}: Readonly<{
  label: "Pickup" | "Drop-off";
  value: string;
  isStarted: boolean;
}>) {
  const labelColorClassName = isStarted
    ? label === "Pickup"
      ? "text-green-600"
      : "text-red-600"
    : "text-slate-400";

  return (
    <View>
      <View className="mb-1 flex-row items-center gap-2">
        <Text className={`min-w-16 text-sm font-medium ${labelColorClassName}`}>
          {label}
        </Text>
        <View
          className={`rounded border px-2 py-0.5 ${
            isStarted ? "border-neutral-200" : "border-slate-200"
          }`}
        >
          <Text
            className={`text-sm font-semibold ${isStarted ? "text-slate-900" : "text-slate-400"}`}
          >
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ExtendedDayAlert({
  isStarted,
  extendedHours,
}: Readonly<{ isStarted: boolean; extendedHours: number }>) {
  const containerClassName = cn(
    "rounded border px-3 py-2",
    isStarted
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-slate-100",
  );
  const textClassName = cn(
    "text-sm",
    isStarted ? "text-amber-800" : "text-slate-600 line-through",
  );
  const verb = isStarted ? "has been" : "was";
  const hoursLabel = extendedHours === 1 ? "hour" : "hours";

  return (
    <View className={containerClassName}>
      <Text className={textClassName}>
        Your drop-off time {verb} extended by {extendedHours} {hoursLabel}.
      </Text>
    </View>
  );
}

function BookingTimelineLegItem({
  leg,
  index,
  totalLegs,
  bookingType,
  bookingStatus,
}: Readonly<{
  leg: BookingDetail["legs"][number];
  index: number;
  totalLegs: number;
  bookingType: BookingType;
  bookingStatus: BookingDetail["status"];
}>) {
  const legStart = new Date(leg.legStartTime);
  const legEnd = new Date(leg.legEndTime);
  const now = new Date();
  const isStarted =
    bookingStatus !== "CANCELLED" &&
    bookingStatus !== "COMPLETED" &&
    now >= legStart &&
    now < legEnd;
  const status = getLegStatus(bookingStatus, legStart, legEnd);
  const extendedHours = leg.extensions.reduce(
    (total, extension) =>
      extension.status === "ACTIVE" && extension.paymentStatus === "PAID"
        ? total + extension.extendedDurationHours
        : total,
    0,
  );
  const isExtendedDayBooking =
    extendedHours > 0 && bookingType === DAY_BOOKING_TYPE;
  const markerClassName = isStarted ? "bg-green-500" : "bg-slate-300";
  const markerLineClassName = isStarted ? "bg-slate-200" : "bg-slate-100";
  const dropoffMarkerClassName = isStarted ? "bg-red-500" : "bg-slate-300";
  const dayTitleClassName = isStarted ? "text-slate-700" : "text-slate-400";
  const serviceTextClassName = isStarted ? "text-slate-600" : "text-slate-400";
  const footerNode: ReactNode = isExtendedDayBooking ? (
    <ExtendedDayAlert isStarted={isStarted} extendedHours={extendedHours} />
  ) : (
    <Text className={`text-sm ${serviceTextClassName}`}>
      {getServiceTypeText(bookingType)}
    </Text>
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Text className={`text-sm font-semibold ${dayTitleClassName}`}>
          Day {index + 1} -{" "}
          {format(toLagosTime(leg.legDate), "EEE, MMM do, yyyy")}
        </Text>
        <View className={`rounded border px-2 py-0.5 ${status.badgeClassName}`}>
          <Text className="text-xs font-medium">{status.text}</Text>
        </View>
      </View>

      <View className="flex-row items-start gap-4">
        <View className="mt-1 items-center">
          <View className={`h-3 w-3 rounded-full ${markerClassName}`} />
          <View className={`h-8 w-px ${markerLineClassName}`} />
          <View className={`h-3 w-3 rounded-full ${dropoffMarkerClassName}`} />
        </View>
        <View className="flex-1 gap-3">
          <BookingLegTimelineRow
            label="Pickup"
            value={formatTimelinePickupTime(bookingType, leg.legStartTime)}
            isStarted={isStarted}
          />
          <BookingLegTimelineRow
            label="Drop-off"
            value={formatTimelineDropoffTime(
              bookingType,
              leg.legEndTime,
              extendedHours,
            )}
            isStarted={isStarted}
          />
        </View>
      </View>

      {footerNode}
      {index < totalLegs - 1 ? <View className="h-px bg-neutral-200" /> : null}
    </View>
  );
}

export function BookingTimelineCard({
  booking,
}: Readonly<{ booking: BookingDetail }>) {
  return (
    <Card className="rounded-xl py-4">
      <CardHeader className="px-4">
        <BookingDetailSectionTitle
          icon={<Calendar size={18} color="#2563EB" />}
          title="Trip Timeline"
        />
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <View className="gap-6">
          {booking.legs.map((leg, index) => (
            <BookingTimelineLegItem
              key={leg.id}
              leg={leg}
              index={index}
              totalLegs={booking.legs.length}
              bookingType={booking.type}
              bookingStatus={booking.status}
            />
          ))}
        </View>
      </CardContent>
    </Card>
  );
}
