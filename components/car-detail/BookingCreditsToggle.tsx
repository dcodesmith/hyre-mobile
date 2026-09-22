import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/currency";
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
    <View>
      <Text className="mb-2 text-sm font-semibold text-foreground">
        Referral credit
      </Text>
      <View className="gap-3 rounded border border-neutral-200 bg-white px-4 py-4 shadow-xl">
        <Pressable
          onPress={() => onApplyCreditsChange(!applyCredits)}
          className="min-h-11 flex-row items-start gap-3"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: applyCredits }}
          accessibilityLabel={`Apply referral credit, -${formatCurrency(creditLimit)}`}
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
          <View className="min-w-0 flex-1">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="min-w-0 flex-1 text-sm font-medium leading-5 text-foreground">
                Apply referral credit
              </Text>
              <Text className="shrink-0 text-sm font-medium leading-5 text-foreground">
                -{formatCurrency(creditLimit)}
              </Text>
            </View>
            <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
              Your available credit is {formatCurrency(availableCredits)}. You
              can use {formatCurrency(creditLimit)} for this booking.
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
