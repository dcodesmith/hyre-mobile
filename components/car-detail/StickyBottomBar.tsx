import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

interface StickyBottomBarProps {
  readonly children: ReactNode;
  readonly sticky?: boolean;
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
  children,
  sticky = true,
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
  const content = (
    <>
      {children}
      {error ? (
        <Text className="text-sm text-red-800">{error}</Text>
      ) : disabledReason ? (
        <Pressable
          onPress={onDisabledReasonPress}
          disabled={!onDisabledReasonPress}
          accessibilityRole={onDisabledReasonPress ? "button" : undefined}
        >
          <Text className="text-sm text-gray-700">{disabledReason}</Text>
        </Pressable>
      ) : null}
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
        <View className="flex-row items-center justify-center">
          <Text className="text-sm font-medium leading-5 text-gray-500">
            Have an account?
          </Text>
          <Pressable
            onPress={onSignIn}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            className="justify-center px-1"
          >
            <Text
              className="text-sm font-medium leading-5 text-neutral-950"
              style={{ textDecorationLine: "underline" }}
            >
              Sign in to book
            </Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  if (!sticky) {
    return (
      <View
        onLayout={onLayout}
        className="gap-6 border-t border-gray-200 bg-gray-100 px-4 pt-4 pb-4"
      >
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      onLayout={onLayout}
      bounces={false}
      keyboardShouldPersistTaps="handled"
      className="absolute bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-gray-100"
      style={{
        maxHeight: "85%",
        boxShadow: "0 8px 50px rgba(0, 0, 0, 0.07)",
      }}
      contentContainerClassName="gap-6 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 16 }}
    >
      {content}
    </ScrollView>
  );
}
