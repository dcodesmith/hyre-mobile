import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function BookingDetailSectionTitle({
  icon,
  title,
}: Readonly<{
  icon: ReactNode;
  title: string;
}>) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-5 w-5 items-center justify-center">{icon}</View>
      <Text className="text-sm font-semibold leading-5 text-neutral-950">
        {title}
      </Text>
    </View>
  );
}
