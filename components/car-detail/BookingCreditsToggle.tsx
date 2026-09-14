import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/currency";
import { Pressable, Text, View } from "react-native";

export function BookingCreditsToggle({
  creditsToUse,
  applyCredits,
  onApplyCreditsChange,
}: {
  readonly creditsToUse: number;
  readonly applyCredits: boolean;
  readonly onApplyCreditsChange: (next: boolean) => void;
}) {
  if (creditsToUse <= 0) return null;

  return (
    <Pressable
      onPress={() => onApplyCreditsChange(!applyCredits)}
      className="mt-4 min-h-11 flex-row items-center gap-2"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: applyCredits }}
      accessibilityLabel={`Apply up to ${formatCurrency(creditsToUse)} in referral credits`}
    >
      <Checkbox
        checked={applyCredits}
        onCheckedChange={() => undefined}
        className="border-neutral-900 shadow-none"
        checkedClassName="border-neutral-900"
        indicatorClassName="bg-neutral-900"
        iconClassName="text-white"
        accessible={false}
        pointerEvents="none"
      />
      <View className="min-h-11 flex-1 justify-center">
        <Text selectable className="text-sm font-medium leading-5 text-gray-900">
          Apply up to {formatCurrency(creditsToUse)} in referral credits
        </Text>
        <Text selectable className="text-xs leading-4 text-gray-500">
          Your total will update before payment.
        </Text>
      </View>
    </Pressable>
  );
}
