import {
  CompactSearchBar,
  SearchSheet,
  useBookingSearchDraft,
} from "@/components/booking-search";
import HomeBookingHero from "@/components/home/booking-hero";
import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const SCROLL_COLLAPSE_THRESHOLD = 100;

export default function HomeScreen() {
  const { onScroll } = useTabBarVisibility();
  const { reset: resetSearchDraft } = useBookingSearchDraft();
  const insets = useSafeAreaInsets();
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const hasUserScrolled = useRef(false);

  // Reset search state when returning to home screen
  useFocusEffect(
    useCallback(() => {
      resetSearchDraft();
    }, [resetSearchDraft]),
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      onScroll(offsetY);
      setHasScrolledPastHero(
        hasUserScrolled.current && offsetY > SCROLL_COLLAPSE_THRESHOLD,
      );
    },
    [onScroll],
  );

  const handleScrollBeginDrag = useCallback(() => {
    hasUserScrolled.current = true;
  }, []);

  const statusBarStyle = hasScrolledPastHero ? "dark" : "light";
  const topStatusAreaHeight = Math.max(insets.top, 24);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["left", "right", "bottom"]}
    >
      <StatusBar key={statusBarStyle} style={statusBarStyle} animated />
      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="automatic"
          style={{ backgroundColor: "#FFFFFF" }}
          contentContainerStyle={{ backgroundColor: "#FFFFFF" }}
        >
          <View className="pb-0">
            <HomeBookingHero />
          </View>
        </ScrollView>

        {/* Sticky compact search bar - rendered after ScrollView with pointerEvents to ensure touch works */}
        {hasScrolledPastHero && (
          <View
            className="absolute left-0 right-0 top-0 z-[999]"
            pointerEvents="box-none"
          >
            <View
              pointerEvents="none"
              style={{ height: topStatusAreaHeight, backgroundColor: "#FFFFFF" }}
            />
            <Pressable
              onPress={() => setIsSearchModalOpen(true)}
              className="border-b border-gray-200 bg-white px-4 py-3 shadow-md"
            >
              <CompactSearchBar
                asChild
                onPress={() => setIsSearchModalOpen(true)}
              />
            </Pressable>
          </View>
        )}

        <SearchSheet
          open={isSearchModalOpen}
          onOpenChange={setIsSearchModalOpen}
        />
      </View>
    </SafeAreaView>
  );
}
