import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BOOKING_TYPE_OPTIONS,
  BOOKING_TYPE_OPTIONS_MAP,
} from "@/lib/booking-types";
import { cn } from "@/lib/utils";

const styles = StyleSheet.create({
  tabLabel: {
    color: "#09090B",
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    lineHeight: 12,
  },
  tabDuration: {
    color: "#4A5565",
    fontFamily: "Geist-Regular",
    fontSize: 12,
    lineHeight: 12,
  },
  selected: {
    boxShadow:
      "inset 0 0 0 1px #99A1AF, 0 4px 10px rgba(0, 0, 0, 0.09)",
  },
});

interface BookingTypeTabsProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly variant?: "search" | "modal";
}

export function BookingTypeTabs({
  value,
  onValueChange,
  variant = "search",
}: BookingTypeTabsProps) {
  if (variant === "modal") {
    return (
      <View
        className="w-full flex-row items-center justify-center rounded-lg border border-gray-200 bg-gray-100 p-1"
        accessibilityLabel="Booking type"
        accessibilityRole="tablist"
      >
        {BOOKING_TYPE_OPTIONS.map((type) => {
          const option = BOOKING_TYPE_OPTIONS_MAP[type];
          const isActive = value === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onValueChange(option.value)}
              className={cn(
                "min-w-0 flex-1 items-center justify-center rounded-md px-1 py-2",
                isActive && "bg-white",
              )}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                className={cn(isActive ? "text-gray-950" : "text-gray-700")}
                style={{
                  fontFamily: "PlusJakartaSans-SemiBold",
                  fontSize: 14,
                }}
              >
                {option.label}
              </Text>
              <Text
                className={cn(isActive ? "text-gray-950" : "text-gray-700")}
                style={{
                  fontFamily: "PlusJakartaSans-Regular",
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                {option.duration}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View
      className="h-12 w-full flex-row items-stretch gap-2"
      accessibilityLabel="Booking type"
      accessibilityRole="tablist"
    >
      {BOOKING_TYPE_OPTIONS.map((type, index) => {
        const option = BOOKING_TYPE_OPTIONS_MAP[type];
        const isActive = value === option.value;

        return (
          <Fragment key={option.value}>
            {index > 0 ? (
              <View className="my-1 w-px shrink-0 bg-gray-300" />
            ) : null}
            <Pressable
              onPress={() => onValueChange(option.value)}
              className={cn(
                "h-12 min-w-0 flex-1 items-center justify-center rounded px-1",
                isActive && "bg-white",
              )}
              style={isActive ? styles.selected : undefined}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={styles.tabLabel}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              <Text
                style={styles.tabDuration}
                className="mt-2"
                numberOfLines={1}
              >
                {option.duration}
              </Text>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}
