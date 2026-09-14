import { ScrollView, View } from "react-native";

export function CarDetailSkeleton() {
  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="h-64 w-full bg-gray-200/80 animate-pulse" />
        <View className="mt-3 mb-2 px-4">
          <View className="h-7 w-56 rounded bg-gray-200/80 animate-pulse" />
        </View>
        <View className="px-4 pt-4 gap-4">
          <View className="h-16 w-full rounded-xl bg-gray-200/80 animate-pulse" />
          <View className="h-14 w-full rounded-xl bg-gray-200/80 animate-pulse" />

          <View className="mt-2 rounded border border-neutral-200 bg-white">
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="h-6 w-28 rounded bg-gray-200/80 animate-pulse" />
              <View className="h-4 w-20 rounded bg-gray-200/80 animate-pulse" />
            </View>
            <View className="px-4 pb-6">
              <View className="h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />

              <View className="mt-4 h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 flex-row gap-2">
                <View className="h-10 flex-1 rounded-md bg-gray-200/80 animate-pulse" />
                <View className="h-10 flex-1 rounded-md bg-gray-200/80 animate-pulse" />
              </View>

              <View className="mt-4 h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />

              <View className="mt-4 h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />

              <View className="mt-4 flex-row items-center gap-2">
                <View className="h-5 w-5 rounded bg-gray-200/80 animate-pulse" />
                <View className="h-4 w-52 rounded bg-gray-200/80 animate-pulse" />
              </View>

              <View className="mt-4 h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
              <View className="mt-2 h-10 w-full rounded-md bg-gray-200/80 animate-pulse" />
            </View>
          </View>

          <View className="mt-2 h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
          <View className="h-40 w-full rounded-xl bg-gray-200/80 animate-pulse" />
        </View>
        <View className="h-40" />
      </ScrollView>
      <View className="border-t border-gray-200 bg-white px-4 py-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="h-4 w-10 rounded bg-gray-200/80 animate-pulse" />
          <View className="h-5 w-24 rounded bg-gray-200/80 animate-pulse" />
        </View>
        <View className="mt-3 h-10 w-full rounded-full bg-gray-200/80 animate-pulse" />
        <View className="mt-3 h-4 w-36 self-center rounded bg-gray-200/80 animate-pulse" />
      </View>
    </View>
  );
}
