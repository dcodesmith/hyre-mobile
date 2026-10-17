import { Button } from "@/components/ui/button";
import {
  ConnectedStops,
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardTitle,
} from "@/components/booking-detail-card";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  DAY_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
  type BookingType,
} from "@/lib/booking-types";
import { formatBookingTime, toLagosTime } from "@/lib/booking-detail-display";
import { cn } from "@/lib/utils";
import type { BookingDetail } from "@/services/bookings";
import { format } from "date-fns-tz";
import { Calendar } from "lucide-react-native";
import { Text, View } from "react-native";

const LEG_STATUS_CLASS = {
  Cancelled: "border-red-200 bg-red-50",
  Active: "border-blue-200 bg-blue-50",
  Completed: "border-green-200 bg-green-50",
  Unknown: "border-slate-200 bg-slate-50",
} as const;

const LEG_STATUS_TEXT_CLASS = {
  Cancelled: "text-red-700",
  Active: "text-blue-700",
  Completed: "text-green-700",
  Unknown: "text-slate-700",
} as const;

function getServiceTypeText(type: BookingType) {
  if (type === FULL_DAY_BOOKING_TYPE) return "Standard 24-hour service";
  if (type === NIGHT_BOOKING_TYPE) return "Standard 6-hour service";
  if (type === AIRPORT_PICKUP_BOOKING_TYPE) return "Airport pickup service";
  return "Standard 12-hour service";
}

function formatLegClock(type: BookingType, value: string) {
  const date = toLagosTime(value);
  return type === FULL_DAY_BOOKING_TYPE
    ? `${format(date, "h:mm a")} - ${format(date, "MMM do")}`
    : format(date, "h:mm a");
}

function confirmedExtensionHours(leg: BookingDetail["legs"][number]) {
  return leg.extensions.reduce(
    (total, extension) =>
      extension.status === "ACTIVE" && extension.paymentStatus === "PAID"
        ? total + extension.extendedDurationHours
        : total,
    0,
  );
}

function TimePoint({
  label,
  timeText,
  labelClassName,
  extended = false,
  muted = false,
}: {
  readonly label: string;
  readonly timeText: string;
  readonly labelClassName: string;
  readonly extended?: boolean;
  readonly muted?: boolean;
}) {
  return (
    <View className="h-6 flex-row items-center gap-2">
      <Text className={cn("w-16 shrink-0 text-sm font-medium leading-5", labelClassName)}>
        {label}
      </Text>
      <View
        className={cn(
          "h-6 items-center justify-center rounded border px-1",
          extended
            ? cn(
                "px-2.5",
                muted ? "border-slate-200" : "border-gray-300",
              )
            : "border-gray-300",
        )}
      >
        <Text
          selectable
          className={cn(
            "text-sm leading-none",
            extended
              ? cn(
                  "font-semibold",
                  muted ? "text-slate-400" : "text-gray-900",
                )
              : "font-normal text-gray-500",
          )}
        >
          {timeText}
        </Text>
      </View>
    </View>
  );
}

function BookingLegTimeline({
  booking,
  leg,
  index,
}: {
  readonly booking: BookingDetail;
  readonly leg: BookingDetail["legs"][number];
  readonly index: number;
}) {
  const now = new Date();
  const legStart = new Date(leg.legStartTime);
  const legEnd = new Date(leg.legEndTime);
  const isStarted = now >= legStart && now < legEnd;
  const isCompleted = now >= legEnd;
  const extendedHours = confirmedExtensionHours(leg);
  const showDayExtension = extendedHours > 0 && booking.type === DAY_BOOKING_TYPE;
  const status =
    booking.status === "CANCELLED"
      ? "Cancelled"
      : isStarted
        ? "Active"
        : isCompleted
          ? "Completed"
          : null;
  const dropoffTime =
    extendedHours > 0
      ? `${formatLegClock(booking.type, leg.legEndTime)} (Extended)`
      : formatLegClock(booking.type, leg.legEndTime);

  return (
    <View className="gap-3.5">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text selectable className="text-sm font-medium leading-6 text-gray-900">
          Day {index + 1} - {format(toLagosTime(leg.legDate), "EEE, MMM do, yyyy")}
        </Text>
        {status ? (
          <View className={cn("rounded-sm border px-2.5 py-0.5", LEG_STATUS_CLASS[status])}>
            <Text
              selectable
              className={cn("text-xs font-semibold", LEG_STATUS_TEXT_CLASS[status])}
            >
              {status}
            </Text>
          </View>
        ) : null}
      </View>
      <ConnectedStops
        anchorClassName="h-6"
        lineClassName="-my-1.5"
        firstDotClassName={isStarted ? "bg-green-500" : "bg-gray-300"}
        secondDotClassName={isStarted ? "bg-red-500" : "bg-gray-300"}
        first={
          <TimePoint
            label="Pickup"
            timeText={formatLegClock(booking.type, leg.legStartTime)}
            labelClassName={isStarted ? "text-green-600" : "text-gray-500"}
          />
        }
        second={
          <TimePoint
            label="Drop-off"
            timeText={dropoffTime}
            labelClassName={isStarted ? "text-red-600" : "text-gray-500"}
            extended={showDayExtension}
            muted={!isStarted}
          />
        }
      />
      {showDayExtension ? (
        <View
          className={cn(
            "rounded-sm border",
            isStarted ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-100",
          )}
        >
          <Text
            selectable
            className={cn(
              "p-4 text-sm leading-5",
              isStarted ? "text-amber-800" : "text-slate-600 line-through",
            )}
          >
            Your drop-off time {isStarted ? "has been" : "was"} extended by {extendedHours}{" "}
            {extendedHours === 1 ? "hour" : "hours"} from {formatBookingTime(booking.endDate)} to{" "}
            {formatBookingTime(leg.legEndTime)}
          </Text>
        </View>
      ) : (
        <Text className="text-sm leading-5 text-gray-500">
          {getServiceTypeText(booking.type)}
        </Text>
      )}
    </View>
  );
}

export function BookingTimelineCard({
  booking,
  onExtend,
}: {
  readonly booking: BookingDetail;
  readonly onExtend?: () => void;
}) {
  return (
    <DetailCard>
      <DetailCardHeader>
        <DetailCardIcon>
          <Calendar size={24} color="#111827" />
        </DetailCardIcon>
        <DetailCardTitle>Trip Timeline</DetailCardTitle>
      </DetailCardHeader>
      <DetailCardBody>
        <View className="gap-4">
          {booking.legs.map((leg, index) => (
            <View
              key={leg.id}
              className={index > 0 ? "border-t border-gray-200 pt-4" : undefined}
            >
              <BookingLegTimeline booking={booking} leg={leg} index={index} />
            </View>
          ))}
        </View>
      </DetailCardBody>
      {onExtend ? (
        <View className="border-t border-gray-200 p-4">
          <Button className="h-10 self-start rounded-md px-4" onPress={onExtend}>
            <Text className="text-sm font-medium text-primary-foreground">Extend Trip</Text>
          </Button>
        </View>
      ) : null}
    </DetailCard>
  );
}
