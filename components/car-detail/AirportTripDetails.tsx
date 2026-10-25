import {
  AIRPORT_PICKUP_BUFFER_MINUTES,
  AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER,
  formatAirportTripDistanceMeters,
  formatBufferedDriveDuration,
  LAGOS_TIMEZONE,
  type AirportTripEstimation,
} from "@/lib/airport-pickup";
import { formatInTimeZone } from "date-fns-tz";
import { Info } from "lucide-react-native";
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
            ? "text-sm font-medium leading-6 text-gray-900"
            : "text-sm leading-6 text-gray-900"
        }
      >
        {label}
      </Text>
      <Text
        selectable
        className="text-sm font-medium leading-6 text-gray-900"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

export function AirportTripDetailsSkeleton() {
  return (
    <View className="mt-6 w-full">
      <View className="mb-2 h-5 w-24 rounded bg-gray-200/80 animate-pulse" />
      <View className="gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <View
            key={`trip-skeleton-row-${index}`}
            className="flex-row justify-between gap-3"
          >
            <View className="h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
            <View className="h-4 w-16 rounded bg-gray-200/80 animate-pulse" />
          </View>
        ))}
        <View className="border-t border-gray-200 pt-2.5">
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
    <View className="mt-6 w-full">
      <View className="mb-3 flex-row items-center gap-2">
        <Text className="text-sm font-semibold leading-5 text-gray-900">
          Trip Details
        </Text>
        <Info size={16} color="#9CA3AF" />
      </View>
      <View className="gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-4">
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
        <View className="border-t border-gray-200 pt-2.5">
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
