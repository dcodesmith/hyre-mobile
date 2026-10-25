import type { BookingPricingAddon } from "@/lib/booking-addons";
import { getBookingRentalCopy } from "@/lib/booking-card-display";
import type { BookingPricingPreviewResponse } from "@/lib/booking-pricing-preview-types";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
} from "@/lib/booking-types";
import type { CostBreakdownData } from "@/lib/car-detail-types";
import { formatCurrency } from "@/lib/currency";
import { Tag } from "lucide-react-native";
import { Text, View } from "react-native";

interface CostBreakdownProps {
  readonly pricing: CostBreakdownData;
  readonly bookingType: BookingType;
  readonly pricingPreview?: BookingPricingPreviewResponse | null;
  readonly estimatedAddons?: readonly BookingPricingAddon[];
}

function LineAmount({
  value,
  compareAt,
}: {
  readonly value: number;
  readonly compareAt?: number | null;
}) {
  const showCompare = compareAt != null && compareAt > value;

  return (
    <View className="flex-row items-center justify-end gap-2">
      {showCompare ? (
        <Text
          className="text-sm font-medium text-gray-900"
          style={{
            textDecorationLine: "line-through",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatCurrency(compareAt)}
        </Text>
      ) : null}
      <Text
        className={
          showCompare
            ? "text-sm font-medium text-red-500"
            : "text-sm font-medium text-gray-900"
        }
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

function SimpleRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-sm leading-6 text-gray-900">{label}</Text>
      <Text
        className="text-sm font-medium leading-6 text-gray-900"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

function RentalRow({
  bookingType,
  units,
  total,
  compareAtUnitPrice,
}: {
  readonly bookingType: BookingType;
  readonly units: number;
  readonly total: number;
  readonly compareAtUnitPrice?: number | null;
}) {
  const copy = getBookingRentalCopy(bookingType, units);
  const compareAt =
    compareAtUnitPrice != null ? compareAtUnitPrice * units : null;

  return (
    <View className="flex-row items-center justify-between gap-3">
      <View>
        <Text className="text-sm leading-6 text-gray-900">{copy.title}</Text>
        {copy.detail ? (
          <Text className="text-xs leading-none text-gray-500">
            {copy.detail}
          </Text>
        ) : null}
      </View>
      <LineAmount value={total} compareAt={compareAt} />
    </View>
  );
}

export function CostBreakdown({
  pricing,
  bookingType,
  pricingPreview = null,
  estimatedAddons = [],
}: CostBreakdownProps) {
  const {
    originalBaseRate,
    totalDays,
    baseTotal,
    vat,
    vatRate,
    finalTotal,
    platformFee,
    platformFeeRate,
    fuelUpgradeCost,
    referralDiscountAmount = 0,
    creditsUsed = 0,
    savingsAmount = 0,
  } = pricing;

  const qty = Math.max(totalDays, 1);
  const rentalRows =
    pricingPreview?.segments && pricingPreview.segments.length > 0
      ? pricingPreview.segments.map((segment, index) => ({
          key: `${segment.kind}-${segment.unitPrice}-${index}`,
          units: segment.units,
          total: segment.total,
          compareAtUnitPrice: segment.compareAtUnitPrice,
        }))
      : [
          {
            key: "estimated",
            units: qty,
            total: baseTotal,
            compareAtUnitPrice: originalBaseRate,
          },
        ];
  const subtotal = finalTotal + creditsUsed;

  return (
    <View>
      <Text className="mb-2 text-sm font-semibold leading-5 text-gray-950">
        Cost Breakdown
      </Text>
      <View className="gap-2.5">
        {rentalRows.map((row) => (
          <RentalRow
            key={row.key}
            bookingType={bookingType}
            units={row.units}
            total={row.total}
            compareAtUnitPrice={row.compareAtUnitPrice}
          />
        ))}
        {(pricingPreview?.addons ?? estimatedAddons).map((addon) => (
          <SimpleRow
            key={addon.id}
            label={
              addon.quantity > 1
                ? `${addon.name} × ${addon.quantity}`
                : addon.name
            }
            value={addon.totalPrice}
          />
        ))}
        {fuelUpgradeCost > 0 &&
        bookingType !== AIRPORT_PICKUP_BOOKING_TYPE ? (
          <SimpleRow
            label="Fuel upgrade to full tank"
            value={fuelUpgradeCost}
          />
        ) : null}
        {platformFee > 0 ? (
          <SimpleRow
            label={`Platform Fee (${platformFeeRate.toFixed(1)}%)`}
            value={platformFee}
          />
        ) : null}
        {referralDiscountAmount > 0 ? (
          <View className="flex-row items-start justify-between gap-3">
            <Text className="text-sm leading-6 text-gray-900">
              Referral discount
            </Text>
            <Text className="text-sm font-medium leading-6 text-emerald-500">
              -{formatCurrency(referralDiscountAmount)}
            </Text>
          </View>
        ) : null}
        <SimpleRow label={`VAT (${vatRate.toFixed(1)}%)`} value={vat} />
      </View>

      <View className="my-4 h-px bg-gray-300" />

      <View className="gap-2.5 rounded-lg bg-white px-3 py-4">
        {creditsUsed > 0 ? (
          <>
            <SimpleRow label="Subtotal" value={subtotal} />
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-1">
                <View className="size-5 items-center justify-center rounded-full bg-red-500">
                  <Tag size={12} color="#FFFFFF" />
                </View>
                <Text className="text-sm leading-6 text-gray-900">
                  Referral credit
                </Text>
              </View>
              <Text className="text-sm font-medium leading-6 text-red-500">
                -{formatCurrency(creditsUsed)}
              </Text>
            </View>
          </>
        ) : null}
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-sm font-semibold leading-5 text-gray-950">
            Order Total:
          </Text>
          <Text
            className="text-base font-semibold leading-6 text-gray-950"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatCurrency(finalTotal)}
          </Text>
        </View>
        {savingsAmount > 0 ? (
          <View className="flex-row justify-between gap-3">
            <Text className="text-sm font-medium leading-none text-emerald-500">
              You save
            </Text>
            <Text
              className="text-sm font-medium leading-none text-emerald-500"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatCurrency(savingsAmount)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
