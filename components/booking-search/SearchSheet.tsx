import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { isExpoWeb } from "@/lib/expo-platform";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@rn-primitives/dialog";
import { X } from "lucide-react-native";
import * as React from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookingSearch } from "./BookingSearch";

const FullWindowOverlay = React.Fragment;

interface SearchSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Full-screen search sheet that slides in from the top.
 * Matches the reference design: white bg, booking type tabs, date/time inputs, Search + Search by AI.
 */
export function SearchSheet({ open, onOpenChange }: SearchSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <FullWindowOverlay>
          <DialogPrimitive.Overlay
            className={cn(
              "absolute inset-0 z-50 flex flex-1 items-start justify-center bg-black/50",
              isExpoWeb && "animate-in fade-in-0 fixed cursor-default",
            )}
            asChild={!isExpoWeb}
          >
            {/* No exiting anim: Android crashes SafeAreaProvider when navigating during exit */}
            <NativeOnlyAnimatedView
              entering={SlideInDown.duration(250)}
              className="w-full flex-1"
            >
              <DialogPrimitive.Content
                className={cn(
                  "w-full flex-1 flex-col rounded-b-3xl border-0 bg-white shadow-lg",
                  isExpoWeb && "animate-in slide-in-from-top duration-250",
                )}
                style={{
                  minHeight: screenHeight,
                  paddingTop: Math.max(16, insets.top),
                }}
                pointerEvents="auto"
              >
                {/* Close button - absolute right-4 top-4 */}
                <DialogPrimitive.Close
                  className="absolute right-4 z-10 rounded-sm opacity-70 active:opacity-100"
                  style={{ top: Math.max(16, insets.top) }}
                  hitSlop={12}
                >
                  <X size={20} strokeWidth={2} color="#525252" />
                  <Text className="sr-only">Close</Text>
                </DialogPrimitive.Close>

                {/* Scrollable content - px-4 py-6 */}
                <ScrollView
                  className="flex-1 overflow-y-auto px-4 py-6"
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  <View className="w-full">
                    <BookingSearch
                      onSearchComplete={() => onOpenChange(false)}
                    />

                    {/* Search by AI - mt-4 flex justify-center */}
                    {/* <View className="mt-4 items-center">
                      <Pressable
                        onPress={() => {
                          onOpenChange(false);
                          // Future: Open AI search flow
                        }}
                        className="overflow-hidden rounded-full"
                      >
                        <LinearGradient
                          colors={["#171717", "#404040"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        >
                          <Sparkles color="#FFFFFF" size={16} strokeWidth={1.75} />
                          <Text className="text-sm font-medium text-white">
                            Search by AI
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    </View> */}
                  </View>
                </ScrollView>
              </DialogPrimitive.Content>
            </NativeOnlyAnimatedView>
          </DialogPrimitive.Overlay>
        </FullWindowOverlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
