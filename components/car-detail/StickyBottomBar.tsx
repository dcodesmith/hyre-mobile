import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Loader2 } from "lucide-react-native";
import {
  type LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SAVINGS_GREEN = "#16a34a";

interface StickyBottomBarProps {
  readonly total: number;
  /** Pre-discount grand total to strike-through; render only when > total. */
  readonly originalTotal?: number;
  /** Savings amount; renders the green “You save …” line when > 0. */
  readonly savingsAmount?: number;
  readonly isSubmitting?: boolean;
  readonly disabled?: boolean;
  readonly onPayNow: () => void;
  readonly onSignIn: () => void;
  readonly error?: string | null;
  /** Shown above Pay Now when the button is disabled and there is no error. */
  readonly disabledReason?: string | null;
  readonly onDisabledReasonPress?: () => void;
  /** When true, primary CTA is "Pay Now" and the guest sign-in row is hidden. */
  readonly isAuthenticated?: boolean;
  readonly onLayout?: (event: LayoutChangeEvent) => void;
}

export function StickyBottomBar({
  total,
  originalTotal,
  savingsAmount,
  isSubmitting = false,
  disabled = false,
  onPayNow,
  onSignIn,
  error,
  disabledReason,
  onDisabledReasonPress,
  isAuthenticated = false,
  onLayout,
}: StickyBottomBarProps) {
  const insets = useSafeAreaInsets();
  const showStrikethrough =
    typeof originalTotal === "number" && originalTotal > total;
  const showSavings = typeof savingsAmount === "number" && savingsAmount > 0;

  return (
    <View
      onLayout={onLayout}
      className="absolute bottom-0 left-0 right-0 z-50 rounded-t-xl border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: insets.bottom }}
    >
      {error ? (
        <View className="border-b border-red-200 bg-red-50 px-4 py-2">
          <Text className="text-sm text-red-800">{error}</Text>
        </View>
      ) : disabledReason ? (
        <Pressable
          onPress={onDisabledReasonPress}
          disabled={!onDisabledReasonPress}
          accessibilityRole={onDisabledReasonPress ? "button" : undefined}
          className="border-b border-gray-200 px-4 py-2"
        >
          <Text className="text-sm text-gray-700">{disabledReason}</Text>
        </Pressable>
      ) : null}

      <View className="flex-col gap-3 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-sm font-medium text-gray-600">Total</Text>
          <View className="min-w-0 flex-col items-end gap-y-0.5">
            <View className="flex-row items-baseline">
              {showStrikethrough ? (
                <Text
                  className="mr-2 text-sm font-normal text-gray-400"
                  style={{
                    textDecorationLine: "line-through",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatCurrency(originalTotal, { fractionDigits: 2 })}
                </Text>
              ) : null}
              <Text
                className="text-base font-semibold text-gray-950"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatCurrency(total, { fractionDigits: 2 })}
              </Text>
            </View>
            {showSavings ? (
              <Text
                className="text-xs font-medium"
                style={{ color: SAVINGS_GREEN }}
              >
                You save {formatCurrency(savingsAmount, { fractionDigits: 2 })}
              </Text>
            ) : null}
          </View>
        </View>

        <Button
          className="h-12 w-full rounded-md bg-neutral-900"
          onPress={onPayNow}
          disabled={disabled || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2
              color="#FFFFFF"
              size={18}
              strokeWidth={2}
              className="animate-spin"
            />
          ) : (
            <Text className="text-sm font-medium text-white">Pay Now</Text>
          )}
        </Button>

        {!isAuthenticated ? (
          <View className="flex-row items-center justify-center pt-1">
            <Text className="text-sm text-gray-600">Have an account?</Text>
            <Pressable
              onPress={onSignIn}
              accessibilityRole="button"
              className="min-h-11 justify-center px-1"
            >
              <Text
                className="text-sm font-medium text-gray-950"
                style={{ textDecorationLine: "underline" }}
              >
                Sign in to book
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
