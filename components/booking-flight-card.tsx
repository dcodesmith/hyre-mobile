import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardTitle,
} from "@/components/booking-detail-card";
import { formatBookingTime, toLagosTime } from "@/lib/booking-detail-display";
import { cn } from "@/lib/utils";
import type { BookingDetail } from "@/services/bookings";
import { format } from "date-fns-tz";
import { Plane } from "lucide-react-native";
import { Text, View } from "react-native";

type Flight = NonNullable<BookingDetail["flight"]>;

const FLIGHT_STATUS_CLASS = {
  SCHEDULED: { container: "border-blue-200 bg-blue-100", text: "text-blue-800" },
  DEPARTED: { container: "border-cyan-200 bg-cyan-100", text: "text-cyan-800" },
  EN_ROUTE: { container: "border-green-200 bg-green-100", text: "text-green-800" },
  LANDED: { container: "border-slate-200 bg-slate-100", text: "text-slate-800" },
  CANCELLED: { container: "border-red-200 bg-red-100", text: "text-red-800" },
  DIVERTED: { container: "border-orange-200 bg-orange-100", text: "text-orange-800" },
  UNKNOWN: { container: "border-gray-200 bg-gray-100", text: "text-gray-800" },
} as const;

function airportMeta(
  city: string | null | undefined,
  iata: string | null | undefined,
  code: string | null | undefined,
) {
  const place = iata || code;
  if (!city && !place) return null;
  return `${city ? `${city} • ` : ""}${place ?? ""}`;
}

function flightDateLabel(flight: Flight) {
  const value = flight.flightDate ?? flight.scheduledArrival;
  return value ? format(toLagosTime(value), "d MMM yyyy") : "TBD";
}

export function BookingFlightCard({ flight }: { readonly flight: Flight }) {
  const status = flight.status ?? "UNKNOWN";
  const statusStyle =
    FLIGHT_STATUS_CLASS[status as keyof typeof FLIGHT_STATUS_CLASS] ??
    FLIGHT_STATUS_CLASS.UNKNOWN;
  const originMeta = airportMeta(flight.originCity, flight.originCodeIATA, flight.originCode);
  const destinationMeta = airportMeta(
    flight.destinationCity,
    flight.destinationCodeIATA,
    flight.destinationCode,
  );
  const delayed = flight.delayMinutes != null && flight.delayMinutes > 0;

  return (
    <DetailCard>
      <DetailCardHeader>
        <DetailCardIcon>
          <Plane size={24} color="#111827" />
        </DetailCardIcon>
        <DetailCardTitle>Flight Information</DetailCardTitle>
      </DetailCardHeader>
      <DetailCardBody>
        <View className="gap-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text selectable className="text-lg font-bold text-slate-900">
                {flight.flightNumber ?? "Flight"}
              </Text>
              <Text selectable className="text-sm text-slate-600">
                {flightDateLabel(flight)}
              </Text>
            </View>
            <View
              className={cn(
                "rounded-sm border px-2.5 py-0.5",
                statusStyle.container,
              )}
            >
              <Text
                selectable
                className={cn("text-sm font-semibold capitalize", statusStyle.text)}
              >
                {status.toLowerCase().replaceAll("_", " ")}
              </Text>
            </View>
          </View>

          <View className="h-px bg-gray-200" />

          <View className="gap-3">
            <View>
              <Text className="text-xs font-medium uppercase text-slate-500">From</Text>
              <Text selectable className="text-sm font-semibold text-slate-900">
                {flight.originName || flight.originCode || "N/A"}
              </Text>
              {originMeta ? (
                <Text selectable className="text-xs text-slate-600">
                  {originMeta}
                </Text>
              ) : null}
            </View>
            <View>
              <Text className="text-xs font-medium uppercase text-slate-500">To</Text>
              <Text selectable className="text-sm font-semibold text-slate-900">
                {flight.destinationName || flight.destinationCode || "N/A"}
              </Text>
              {destinationMeta ? (
                <Text selectable className="text-xs text-slate-600">
                  {destinationMeta}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="h-px bg-gray-200" />

          <View className="flex-row flex-wrap gap-3">
            <View className="min-w-[45%] flex-1">
              <Text className="text-xs font-medium uppercase text-slate-500">
                Scheduled Arrival
              </Text>
              <Text selectable className="text-sm font-semibold text-slate-900">
                {formatBookingTime(flight.scheduledArrival)}
              </Text>
            </View>
            {flight.estimatedArrival ? (
              <View className="min-w-[45%] flex-1">
                <Text className="text-xs font-medium uppercase text-slate-500">
                  Estimated Arrival
                </Text>
                <Text selectable className="text-sm font-semibold text-slate-900">
                  {formatBookingTime(flight.estimatedArrival)}
                </Text>
              </View>
            ) : null}
            {flight.actualArrival ? (
              <View className="min-w-[45%] flex-1">
                <Text className="text-xs font-medium uppercase text-slate-500">
                  Actual Arrival
                </Text>
                <Text selectable className="text-sm font-semibold text-slate-900">
                  {formatBookingTime(flight.actualArrival)}
                </Text>
              </View>
            ) : null}
          </View>

          {delayed ? (
            <View className="rounded border border-orange-200 bg-orange-50 p-4">
              <Text selectable className="text-sm text-orange-800">
                Delayed by {flight.delayMinutes} minutes
              </Text>
            </View>
          ) : null}

          {flight.aircraftType ? (
            <View className="border-t border-gray-200 pt-2">
              <Text selectable className="text-xs text-slate-500">
                Aircraft: {flight.aircraftType}
                {flight.registration ? ` • ${flight.registration}` : ""}
              </Text>
            </View>
          ) : null}
        </View>
      </DetailCardBody>
    </DetailCard>
  );
}
