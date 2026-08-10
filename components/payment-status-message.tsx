import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatusTone = "blue" | "emerald" | "orange" | "red";

const toneClasses: Record<StatusTone, { title: string; message: string }> = {
  blue: { title: "text-blue-700", message: "text-blue-700" },
  emerald: { title: "text-emerald-700", message: "text-emerald-700" },
  orange: { title: "text-orange-700", message: "text-orange-700" },
  red: { title: "text-red-700", message: "text-red-600" },
};

type StatusAction = {
  label: string;
  onPress: () => void;
};

type PaymentStatusMessageProps = {
  title: string;
  message: string;
  tone: StatusTone;
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
  loading?: boolean;
  children?: ReactNode;
};

export function PaymentStatusMessage({
  title,
  message,
  tone,
  primaryAction,
  secondaryAction,
  loading = false,
  children,
}: Readonly<PaymentStatusMessageProps>) {
  const classes = toneClasses[tone];

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="items-center">
          {loading ? <ActivityIndicator size="large" color="#2563EB" /> : null}
          <Text
            className={`${loading ? "mt-4" : ""} text-center text-xl font-semibold ${classes.title}`}
          >
            {title}
          </Text>
          <Text
            selectable
            className={`mt-3 text-center text-sm ${classes.message}`}
          >
            {message}
          </Text>
          {children}
          {primaryAction ? (
            <Pressable
              className="mt-6 h-11 min-w-[180px] items-center justify-center rounded-md bg-black px-5"
              onPress={primaryAction.onPress}
            >
              <Text className="text-sm font-semibold text-white">
                {primaryAction.label}
              </Text>
            </Pressable>
          ) : null}
          {secondaryAction ? (
            <Pressable
              className="mt-3 px-5 py-3"
              onPress={secondaryAction.onPress}
            >
              <Text className="text-sm font-semibold text-blue-700">
                {secondaryAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
