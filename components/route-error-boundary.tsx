import type { ErrorBoundaryProps } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { reportRouteError } from "@/lib/telemetry";

export function RouteErrorBoundary({
  error,
  retry,
}: Readonly<ErrorBoundaryProps>) {
  useEffect(() => {
    reportRouteError(error);
  }, [error]);

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 items-center justify-center gap-5 px-6 py-12">
          <View className="size-14 items-center justify-center rounded-full bg-orange-100">
            <TriangleAlert size={28} color="#c2410c" aria-hidden />
          </View>

          <View className="w-full max-w-md items-center gap-2">
            <Text selectable variant="h3" className="text-center">
              Something went wrong
            </Text>
            <Text selectable className="text-center text-muted-foreground">
              Try loading this screen again. If the problem continues, close and
              reopen the app.
            </Text>
            {__DEV__ ? (
              <Text selectable variant="code" className="mt-2 text-xs">
                {error.message}
              </Text>
            ) : null}
          </View>

          <View className="w-full max-w-md gap-3">
            <Button size="lg" onPress={retry}>
              <Text>Try again</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
