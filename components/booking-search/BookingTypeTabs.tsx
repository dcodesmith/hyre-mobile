import {
  BOOKING_TYPE_OPTIONS,
  BOOKING_TYPE_OPTIONS_MAP,
} from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const FONT = {
  semiBold: "PlusJakartaSans-SemiBold" as const,
  regular: "PlusJakartaSans-Regular" as const,
};

const easing = Easing.out(Easing.cubic);

const styles = StyleSheet.create({
  tabLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
  },
  tabDuration: {
    fontFamily: FONT.regular,
    fontSize: 12,
  },
  tabIndicator: {
    position: "absolute" as const,
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
});

type Variant = "compact" | "hero" | "modal";

interface BookingTypeTabsProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly variant: Variant;
}

export function BookingTypeTabs({
  value,
  onValueChange,
  variant,
}: BookingTypeTabsProps) {
  const translateAnim = useRef(new Animated.Value(0)).current;
  const widthAnim = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});
  const hasInitialized = useRef(false);
  const lastInitializedValue = useRef<string | null>(null);

  const animateToTab = useCallback(
    (index: number) => {
      const layout = tabLayouts.current[index];
      if (!layout) return;
      Animated.parallel([
        Animated.timing(translateAnim, {
          toValue: layout.x,
          duration: 260,
          easing,
          useNativeDriver: false,
        }),
        Animated.timing(widthAnim, {
          toValue: layout.width,
          duration: 260,
          easing,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [translateAnim, widthAnim],
  );

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabLayouts.current[index] = { x, width };

      // Find which tab index matches the current value
      const activeIndex = BOOKING_TYPE_OPTIONS.findIndex(
        (t) => BOOKING_TYPE_OPTIONS_MAP[t].value === value,
      );
      const targetIndex = Math.max(activeIndex, 0);

      // Check if all tabs are laid out
      const allLayoutsReady = BOOKING_TYPE_OPTIONS.every(
        (_, i) => tabLayouts.current[i] !== undefined,
      );

      // Once all layouts are ready, position the indicator at the active tab
      if (allLayoutsReady) {
        const targetLayout = tabLayouts.current[targetIndex];
        if (targetLayout) {
          // Initialize or re-initialize if value changed since last init
          if (
            !hasInitialized.current ||
            lastInitializedValue.current !== value
          ) {
            translateAnim.setValue(targetLayout.x);
            widthAnim.setValue(targetLayout.width);
            hasInitialized.current = true;
            lastInitializedValue.current = value;
          }
        }
      }
    },
    [translateAnim, widthAnim, value],
  );

  const handleTabPress = useCallback(
    (index: number, optionValue: string) => {
      onValueChange(optionValue);

      if (variant === "hero" || variant === "modal") {
        animateToTab(index);
      }
    },
    [onValueChange, variant, animateToTab],
  );

  // Sync indicator when value changes (e.g. from URL or context)
  useEffect(() => {
    if (variant !== "hero" && variant !== "modal") {
      return;
    }

    const index = BOOKING_TYPE_OPTIONS.findIndex(
      (t) => BOOKING_TYPE_OPTIONS_MAP[t].value === value,
    );

    if (index >= 0 && tabLayouts.current[index]) {
      animateToTab(index);
    }
  }, [value, variant, animateToTab]);

  if (variant === "compact") {
    return (
      <View
        className="flex-row h-7 items-center justify-center p-0.5 gap-0.5 bg-gray-100 rounded-full"
        accessibilityLabel="Booking type"
      >
        {BOOKING_TYPE_OPTIONS.map((type, index) => {
          const option = BOOKING_TYPE_OPTIONS_MAP[type];
          const isActive = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleTabPress(index, option.value)}
              className={cn(
                "flex items-center justify-center h-6 px-2.5 rounded-full",
                isActive && "bg-white",
              )}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.tabLabel, { fontSize: 12 }]}
                className={isActive ? "text-gray-900" : "text-gray-600"}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View className="w-full">
      <View
        className={cn(
          "relative flex-row items-center justify-center p-1 w-full rounded-lg",
          variant === "hero" && "bg-white/10 border border-white/20",
          variant === "modal" && "bg-gray-100 border border-gray-200",
        )}
        accessibilityLabel="Booking type"
      >
        {(variant === "hero" || variant === "modal") && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabIndicator,
              {
                transform: [{ translateX: translateAnim }],
                width: widthAnim,
              },
            ]}
          />
        )}

        {BOOKING_TYPE_OPTIONS.map((type, index) => {
          const option = BOOKING_TYPE_OPTIONS_MAP[type];
          const isActive = value === option.value;
          const inactiveColor =
            variant === "hero" ? "rgba(255,255,255,1)" : "#374151";
          const activeColor = "#111827";

          return (
            <Pressable
              key={option.value}
              onPress={() => handleTabPress(index, option.value)}
              onLayout={(e) => handleTabLayout(index, e)}
              className="flex-1 flex-col items-center justify-center min-w-0 py-2 px-1 rounded-md"
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? activeColor : inactiveColor },
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.tabDuration,
                  {
                    opacity: 0.8,
                    color: isActive ? activeColor : inactiveColor,
                  },
                ]}
              >
                {option.duration}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
