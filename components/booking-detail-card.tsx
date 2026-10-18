import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function DetailCard({ children }: { readonly children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded border border-gray-200 bg-white">
      {children}
    </View>
  );
}

export function DetailCardHeader({ children }: { readonly children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 border-b border-gray-200 bg-gray-50 p-4">
      {children}
    </View>
  );
}

export function DetailCardTitle({ children }: { readonly children: ReactNode }) {
  return (
    <Text className="text-base font-semibold leading-6 text-gray-900">
      {children}
    </Text>
  );
}

export function DetailCardBody({ children }: { readonly children: ReactNode }) {
  return <View className="p-4">{children}</View>;
}

export function DetailCardIcon({ children }: { readonly children: ReactNode }) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-6 w-6 items-center justify-center"
    >
      {children}
    </View>
  );
}

export function ConnectedStops({
  first,
  second,
  firstDotClassName = "bg-gray-300",
  secondDotClassName = "bg-gray-300",
  anchorClassName = "h-5",
  lineClassName = "-my-1",
}: {
  readonly first: ReactNode;
  readonly second: ReactNode;
  readonly firstDotClassName?: string;
  readonly secondDotClassName?: string;
  readonly anchorClassName?: string;
  readonly lineClassName?: string;
}) {
  return (
    <View>
      <View className="flex-row gap-[3px]">
        <View className="w-[18px] shrink-0 items-center self-stretch">
          <View
            className={cn(
              "w-full shrink-0 items-center justify-center",
              anchorClassName,
            )}
          >
            <View className={cn("h-3 w-3 rounded-full", firstDotClassName)} />
          </View>
          <View className={cn("w-px flex-1 bg-gray-300", lineClassName)} />
        </View>
        <View className="min-w-0 flex-1 pb-4">{first}</View>
      </View>
      <View className="flex-row gap-[3px]">
        <View
          className={cn(
            "w-[18px] shrink-0 items-center justify-center self-start",
            anchorClassName,
          )}
        >
          <View className={cn("h-3 w-3 rounded-full", secondDotClassName)} />
        </View>
        <View className="min-w-0 flex-1">{second}</View>
      </View>
    </View>
  );
}
