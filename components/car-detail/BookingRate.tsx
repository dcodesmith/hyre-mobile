import { type BookingType } from "@/lib/booking-types";
import type { CostBreakdownData } from "@/lib/car-detail-types";
import { formatRateAmount } from "@/lib/currency";
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
          className="font-medium text-gray-400 text-[16px] leading-6"
          style={{
            textDecorationLine: "line-through",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatRateAmount(originalBaseRate)}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-baseline gap-1 shrink">
        <Text
          className={
            originalBaseRate != null
              ? "shrink font-semibold text-red-500 text-[16px] leading-6"
              : "shrink font-semibold text-gray-900 text-[16px] leading-6"
          }
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatRateAmount(pricing.baseRate)}
        </Text>
        <Text className="shrink font-normal text-gray-500 text-[16px] leading-6">
          {RATE_SUFFIX[bookingType]}
        </Text>
      </View>
    </View>
  );
}
