import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Loader2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
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
  /** When true, primary CTA is "Pay Now" and the guest sign-in row is hidden. */
  readonly isAuthenticated?: boolean;
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
  isAuthenticated = false,
}: StickyBottomBarProps) {
  const insets = useSafeAreaInsets();
  const showStrikethrough =
    typeof originalTotal === "number" && originalTotal > total;
  const showSavings = typeof savingsAmount === "number" && savingsAmount > 0;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-50 rounded-t-xl border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: insets.bottom }}
    >
      {/* Error message */}
      {error && (
        <View className="px-4 py-2 bg-red-50 border-b border-red-200">
          <Text className="text-red-800 text-sm">{error}</Text>
        </View>
      )}

      {/* hireApp `BookingCardLayout` mobile sticky footer parity:
        - container: p-4
        - vertical rhythm between sections: 12px (space-y-3 → flex-col gap-3)
        - total row: items-center, gap-2
        - mobile total markup matches `PromoBookingTotal` desktop=mobile spec:
          flex-col items-end gap-0.5; strike `mr-2`; payable `text-base font-semibold`;
          savings `text-xs font-medium text-green-600`. */}
      <View className="p-4 flex-col gap-3">
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
          className="h-10 w-full rounded-full bg-neutral-900"
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
            <Text className="text-sm font-medium text-white">
              {isAuthenticated ? "Pay Now" : "Pay Now as Guest"}
            </Text>
          )}
        </Button>

        {!isAuthenticated && (
          <View className="flex-row items-center justify-center pt-1">
            <Text className="text-sm text-gray-600">Have an account?</Text>
            <Pressable
              onPress={onSignIn}
              accessibilityRole="button"
              className="px-1"
            >
              <Text
                className="text-sm font-medium text-gray-950"
                style={{ textDecorationLine: "underline" }}
              >
                Sign in to book
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
