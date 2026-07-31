import type { CarPromotion } from "@/lib/car-types";
import { formatCurrency } from "@/lib/currency";
import {
  applyPromotionDiscount,
  hasActivePromotion,
} from "@/lib/promotion-utils";
import { cn } from "@/lib/utils";
import { Text, View } from "react-native";

const ACCENT = "#D32F2F";

type PromotionalPriceRowProps = {
  readonly listRate: number;
  readonly promotion: CarPromotion | null | undefined;
  readonly suffix: string;
  readonly size?: "sm" | "md";
};

/**
 * hireApp-style row: strikethrough list price + emphasized discounted price + suffix.
 */
export function PromotionalPriceRow({
  listRate,
  promotion,
  suffix,
  size = "sm",
}: PromotionalPriceRowProps) {
  const discounted =
    hasActivePromotion(promotion) && listRate > 0
      ? applyPromotionDiscount(listRate, promotion.discountValue)
      : listRate;
  const showPromo = hasActivePromotion(promotion) && discounted < listRate;

  const strikeClass = cn(
    "text-gray-400",
    size === "md" ? "text-base" : "text-xs",
  );
  const priceClass = cn(
    "font-semibold text-gray-900",
    size === "md" ? "text-lg" : "text-sm",
  );
  const suffixClass = cn("text-sm text-gray-600");

  return (
    <View className="flex-row flex-wrap items-baseline gap-1.5">
      {showPromo ? (
        <Text
          className={strikeClass}
          style={{ textDecorationLine: "line-through" }}
        >
          {formatCurrency(listRate)}
        </Text>
      ) : null}
      <Text
        className={priceClass}
        style={showPromo ? { color: ACCENT } : undefined}
      >
        {formatCurrency(discounted)}
      </Text>
      <Text className={suffixClass}>{suffix}</Text>
    </View>
  );
}
