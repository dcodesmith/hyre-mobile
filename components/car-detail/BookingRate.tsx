import { type BookingType } from "@/lib/booking-types";
import type { CostBreakdownData } from "@/lib/car-detail-types";
import { formatCurrency } from "@/lib/currency";
import { Text, View } from "react-native";

const RATE_SUFFIX: Record<BookingType, string> = {
  DAY: "/day",
  NIGHT: "/night",
  FULL_DAY: "/full day",
  AIRPORT_PICKUP: "/pickup",
};

interface BookingRateProps {
  readonly pricing: Pick<
    CostBreakdownData,
    "baseRate" | "originalBaseRate"
  >;
  readonly bookingType: BookingType;
}

export function BookingRate({
  pricing,
  bookingType,
}: BookingRateProps) {
  const originalBaseRate = pricing.originalBaseRate;

  return (
    <View className="flex-row flex-wrap items-baseline gap-2">
      {originalBaseRate != null ? (
        <Text
          className="text-xl font-medium leading-5 text-gray-400"
          style={{
            textDecorationLine: "line-through",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatCurrency(originalBaseRate, { fractionDigits: 0 })}
        </Text>
      ) : null}
      <View className="flex-row items-baseline gap-1">
        <Text
          className={
            originalBaseRate != null
              ? "text-xl font-semibold leading-5 text-red-500"
              : "text-xl font-semibold leading-5 text-gray-900"
          }
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatCurrency(pricing.baseRate, { fractionDigits: 0 })}
        </Text>
        <Text className="text-xl font-normal leading-5 text-gray-500">
          {RATE_SUFFIX[bookingType]}
        </Text>
      </View>
    </View>
  );
}
