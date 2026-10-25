import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/currency";
import { Info } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export function BookingCreditsToggle({
  availableCredits,
  creditLimit,
  applyCredits,
  onApplyCreditsChange,
}: {
  readonly availableCredits: number;
  readonly creditLimit: number;
  readonly applyCredits: boolean;
  readonly onApplyCreditsChange: (next: boolean) => void;
}) {
  if (availableCredits <= 0 || creditLimit <= 0) return null;

  return (
    <View
      className="rounded-lg border border-gray-200 bg-white px-4 py-6"
      style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.07)" }}
    >
      <View className="mb-4 flex-row items-center gap-2">
        <Text className="text-base font-semibold leading-5 text-gray-900">
          Apply Referral Credit
        </Text>
        <Info size={16} color="#9CA3AF" />
      </View>
      <Pressable
        onPress={() => onApplyCreditsChange(!applyCredits)}
        className="min-h-11 flex-row items-start gap-3"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: applyCredits }}
        accessibilityLabel={`Apply referral credit, ${formatCurrency(creditLimit)} available to use`}
      >
        <Checkbox
          checked={applyCredits}
          onCheckedChange={() => undefined}
          className="mt-0.5 border-neutral-900 shadow-none"
          checkedClassName="border-neutral-900"
          indicatorClassName="bg-neutral-900"
          iconClassName="text-white"
          accessible={false}
          pointerEvents="none"
        />
        <View className="min-w-0 flex-1 flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-medium leading-5 text-gray-900">
              Referral credit
            </Text>
            <Text className="mt-0.5 text-sm leading-5 text-green-600">
              {formatCurrency(creditLimit)} available to use
            </Text>
          </View>
          <Text
            className="shrink-0 text-sm font-medium leading-5 text-gray-900"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatCurrency(availableCredits)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
