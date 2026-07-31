import { promotionBadgeLabel } from "@/lib/promotion-utils";
import { Tag } from "lucide-react-native";
import { Text, View } from "react-native";

const BADGE_BG = "#EF5350";

type PromotionBadgeProps = {
  readonly discountPercent: number;
  /** Tighter padding for booking card header */
  readonly compact?: boolean;
};

export function PromotionBadge({
  discountPercent,
  compact = false,
}: PromotionBadgeProps) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{
        backgroundColor: BADGE_BG,
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 4 : 5,
        gap: 4,
      }}
    >
      <Tag size={compact ? 11 : 12} color="#FFFFFF" strokeWidth={2.25} />
      <Text
        className="font-bold uppercase text-white"
        style={{ fontSize: compact ? 10 : 11, letterSpacing: 0.3 }}
      >
        {promotionBadgeLabel(discountPercent)}
      </Text>
    </View>
  );
}
