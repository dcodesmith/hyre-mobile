import {
  AIRPORT_PICKUP_BUFFER_MINUTES,
  AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER,
  formatAirportTripDistanceMeters,
  formatBufferedDriveDuration,
  LAGOS_TIMEZONE,
  type AirportTripEstimation,
} from "@/lib/airport-pickup";
import { formatInTimeZone } from "date-fns-tz";
import { Text, View } from "react-native";

export type { AirportTripEstimation };

function TripRow({
  label,
  value,
  emphasis = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly emphasis?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text
        className={
          emphasis
            ? "text-sm font-semibold text-gray-600"
            : "text-sm text-gray-600"
        }
      >
        {label}
      </Text>
      <Text
        selectable
        className={
          emphasis
            ? "text-sm font-semibold text-gray-950"
            : "text-sm font-medium text-gray-950"
        }
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

export function AirportTripDetailsSkeleton() {
  return (
    <View className="w-full">
      <View className="mb-2 h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
      <View className="gap-3 rounded border border-neutral-200 bg-white px-4 py-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <View
            key={`trip-skeleton-row-${index}`}
            className="flex-row justify-between gap-3"
          >
            <View className="h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
            <View className="h-4 w-16 rounded bg-gray-200/80 animate-pulse" />
          </View>
        ))}
        <View className="mt-1 border-t border-gray-200 pt-2">
          <View className="flex-row justify-between gap-3">
            <View className="h-4 w-32 rounded bg-gray-200/80 animate-pulse" />
            <View className="h-4 w-16 rounded bg-gray-200/80 animate-pulse" />
          </View>
        </View>
      </View>
    </View>
  );
}

export function AirportTripDetails({
  estimation,
}: {
  readonly estimation: AirportTripEstimation;
}) {
  const arrivalDate = new Date(estimation.estimatedArrivalIso);
  const pickupDate = new Date(
    arrivalDate.getTime() + AIRPORT_PICKUP_BUFFER_MINUTES * 60 * 1000,
  );
  const bufferedDriveMinutes = Math.ceil(
    estimation.durationMinutes * AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER,
  );
  const dropOffDate = new Date(
    pickupDate.getTime() + bufferedDriveMinutes * 60 * 1000,
  );

  const time = (date: Date) =>
    formatInTimeZone(date, LAGOS_TIMEZONE, "h:mm a").replace(/\s+/g, " ");

  const driveLabel = formatBufferedDriveDuration(bufferedDriveMinutes);

  return (
    <View className="w-full">
      <Text className="mb-2 text-sm font-semibold text-gray-950">
        Trip Details
      </Text>
      <View
        className="gap-1.5 rounded border border-neutral-200 bg-white px-4 py-4"
        style={{ borderCurve: "continuous" }}
      >
        <TripRow label="Flight Arrival" value={time(arrivalDate)} />
        <TripRow label="Pickup Time" value={time(pickupDate)} />
        <TripRow
          label="Estimated Drive"
          value={
            estimation.isEstimate
              ? `${driveLabel} (estimated)`
              : driveLabel
          }
        />
        <TripRow
          label="Distance"
          value={formatAirportTripDistanceMeters(estimation.distanceMeters)}
        />
        <View className="mt-1 border-t border-gray-200 pt-1.5">
          <TripRow
            label="Estimated Drop-off"
            value={time(dropOffDate)}
            emphasis
          />
        </View>
      </View>
    </View>
  );
}
