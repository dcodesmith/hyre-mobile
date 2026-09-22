import { getUnitLabel } from "@/hooks/use-booking-pricing";
import type { BookingPricingAddon } from "@/lib/booking-addons";
import type { BookingPricingPreviewResponse } from "@/lib/booking-pricing-preview-types";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  BOOKING_TYPE_LABELS,
  type BookingType,
} from "@/lib/booking-types";
import type { CostBreakdownData } from "@/lib/car-detail-types";
import { formatCurrency } from "@/lib/currency";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

interface CostBreakdownProps {
  readonly pricing: CostBreakdownData;
  readonly bookingType: BookingType;
  readonly pricingPreview?: BookingPricingPreviewResponse | null;
  readonly estimatedAddons?: readonly BookingPricingAddon[];
  /** Hide the in-card total. Sticky footer renders the (promotional) total. */
  readonly hideTotal?: boolean;
}

/**
 * hireApp `BookingCostBreakdown` parity:
 * - card: `bg-white border border-neutral-200 rounded shadow-xl p-4`
 * - dl: `text-gray-950 text-sm`
 * - rows: `flex justify-between gap-2 mb-1.5`, last row no mb-1.5
 * - dt: `text-gray-600 min-w-0` (gray-600 label by default; promo override = dark)
 * - dd: `font-medium shrink-0 text-right` (dark)
 * - strike: `text-gray-400 line-through mr-1.5`
 */
function rentalLineLeftContent(
  bookingType: BookingType,
  baseRate: number,
  originalBaseRate: number | undefined,
  qty: number,
  unitLabel: string,
): ReactNode {
  const isAirport = bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  const hasPerUnitDiscount =
    originalBaseRate != null && originalBaseRate > baseRate;

  if (isAirport && !hasPerUnitDiscount) {
    return (
      <Text className="min-w-0 flex-1 pr-2 text-sm text-gray-600">
        Airport Pickup
      </Text>
    );
  }

  if (hasPerUnitDiscount && originalBaseRate != null) {
    // Strike + discounted rate inline; discounted text is dark (text-primary in web).
    return (
      <View className="min-w-0 flex-1 flex-row flex-wrap items-baseline pr-2">
        <Text
          className="mr-1.5 text-sm font-normal text-gray-400"
          style={{ textDecorationLine: "line-through" }}
        >
          {formatCurrency(originalBaseRate, { fractionDigits: 2 })}
        </Text>
        <Text className="text-sm text-gray-950">
          {`${formatCurrency(baseRate, { fractionDigits: 2 })} × ${qty} ${unitLabel}`}
        </Text>
      </View>
    );
  }

  return (
    <Text className="min-w-0 flex-1 pr-2 text-sm text-gray-600">
      {`${formatCurrency(baseRate, { fractionDigits: 2 })} × ${qty} ${unitLabel}`}
    </Text>
  );
}

export function CostBreakdown({
  pricing,
  bookingType,
  pricingPreview = null,
  estimatedAddons = [],
  hideTotal = true,
}: CostBreakdownProps) {
  const {
    baseRate,
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
  } = pricing;

  const unitLabels = getUnitLabel(bookingType);
  const unitLabel = totalDays === 1 ? unitLabels.singular : unitLabels.plural;
  const qty = Math.max(totalDays, 1);

  const leftRentalLabel = rentalLineLeftContent(
    bookingType,
    baseRate,
    originalBaseRate,
    qty,
    unitLabel,
  );

  const splitSegments = pricingPreview?.segments ?? null;
  const hasSplitPricing = !!splitSegments && splitSegments.length > 0;

  return (
    <View className="rounded border border-neutral-200 bg-white p-4 shadow-xl">
      {hasSplitPricing ? (
        splitSegments.map((segment, index) => {
          const unitLabel =
            segment.units === 1
              ? BOOKING_TYPE_LABELS[bookingType].singular
              : BOOKING_TYPE_LABELS[bookingType].plural;
          const segmentRateText = `${formatCurrency(segment.unitPrice, { fractionDigits: 2 })} × ${segment.units} ${unitLabel}`;
          return (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: segment rows are deterministic from API grouping
              key={`${segment.kind}-${segment.unitPrice}-${segment.compareAtUnitPrice}-${index}`}
              className="mb-1.5 flex-row items-baseline justify-between gap-2"
            >
              {segment.kind === "PROMO" ? (
                <View className="min-w-0 flex-1 flex-row flex-wrap items-baseline pr-2">
                  {segment.compareAtUnitPrice != null ? (
                    <Text
                      className="mr-1.5 text-sm font-normal text-gray-400"
                      style={{ textDecorationLine: "line-through" }}
                    >
                      {formatCurrency(segment.compareAtUnitPrice, {
                        fractionDigits: 2,
                      })}
                    </Text>
                  ) : null}
                  <Text className="text-sm text-gray-950">
                    {segmentRateText}
                  </Text>
                </View>
              ) : (
                <Text className="min-w-0 flex-1 pr-2 text-sm text-gray-600">
                  {segmentRateText}
                </Text>
              )}
              <Text className="shrink-0 text-right text-sm font-medium text-gray-950">
                {formatCurrency(segment.total, { fractionDigits: 2 })}
              </Text>
            </View>
          );
        })
      ) : (
        <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
          {leftRentalLabel}
          <Text className="shrink-0 text-right text-sm font-medium text-gray-950">
            {formatCurrency(baseTotal, { fractionDigits: 2 })}
          </Text>
        </View>
      )}

      {(pricingPreview?.addons ?? estimatedAddons).map((addon) => (
        <View
          key={addon.id}
          className="mb-1.5 flex-row items-baseline justify-between gap-2"
        >
          <Text className="min-w-0 flex-1 pr-2 text-sm text-gray-600">
            {addon.quantity > 1
              ? `${addon.name} × ${addon.quantity}`
              : addon.name}
          </Text>
          <Text className="shrink-0 text-right text-sm font-medium text-gray-950">
            {formatCurrency(addon.totalPrice, { fractionDigits: 2 })}
          </Text>
        </View>
      ))}

      {fuelUpgradeCost > 0 && bookingType !== AIRPORT_PICKUP_BOOKING_TYPE ? (
        <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
          <Text className="text-sm text-gray-600">
            Fuel Upgrade to Full Tank
          </Text>
          <Text className="text-sm font-medium text-gray-950">
            {formatCurrency(fuelUpgradeCost, { fractionDigits: 2 })}
          </Text>
        </View>
      ) : null}

      {platformFee > 0 ? (
        <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
          <Text className="text-sm text-gray-600">
            Platform Fee ({platformFeeRate.toFixed(1)}%)
          </Text>
          <Text className="text-sm font-medium text-gray-950">
            {formatCurrency(platformFee, { fractionDigits: 2 })}
          </Text>
        </View>
      ) : null}

      {referralDiscountAmount > 0 ? (
        <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
          <Text className="text-sm text-green-600">Referral Discount</Text>
          <Text className="text-sm font-medium text-green-600">
            -{formatCurrency(referralDiscountAmount, { fractionDigits: 2 })}
          </Text>
        </View>
      ) : null}

      {creditsUsed > 0 ? (
        <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
          <Text className="text-sm text-green-600">Referral credit</Text>
          <Text className="text-sm font-medium text-green-600">
            -{formatCurrency(creditsUsed, { fractionDigits: 2 })}
          </Text>
        </View>
      ) : null}

      {/* VAT row — no margin (last row) */}
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="text-sm text-gray-600">
          VAT ({vatRate.toFixed(1)}%)
        </Text>
        <Text className="text-sm font-medium text-gray-950">
          {formatCurrency(vat, { fractionDigits: 2 })}
        </Text>
      </View>

      {!hideTotal ? (
        <>
          <View className="my-2 border-t border-gray-200" />
          <View className="flex-row items-baseline justify-between gap-2">
            <Text className="text-base font-semibold text-gray-950">Total</Text>
            <Text className="text-base font-semibold text-gray-950">
              {formatCurrency(finalTotal, { fractionDigits: 2 })}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
