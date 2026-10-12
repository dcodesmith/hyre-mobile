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
const SCROLLED_TOP_BACKGROUND_HEIGHT = 112;
const COMPACT_SEARCH_CONTROL_HEIGHT = 44;
const COMPACT_SEARCH_BOTTOM_PADDING = 12;
const SCROLLED_TOP_BORDER_HEIGHT = 1;

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
  const scrolledTopBackgroundHeight = Math.max(
    SCROLLED_TOP_BACKGROUND_HEIGHT,
    topStatusAreaHeight +
      COMPACT_SEARCH_CONTROL_HEIGHT +
      COMPACT_SEARCH_BOTTOM_PADDING +
      SCROLLED_TOP_BORDER_HEIGHT,
  );
  const scrolledStatusHeight = topStatusAreaHeight;

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
          contentInsetAdjustmentBehavior="never"
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
            className="absolute left-0 right-0 top-0 z-[999] overflow-hidden border-b border-gray-200 bg-gray-100"
            pointerEvents="box-none"
            style={{
              height: scrolledTopBackgroundHeight,
              boxSizing: "border-box",
            }}
          >
            <View
              pointerEvents="none"
              style={{ height: scrolledStatusHeight }}
            />
            <View
              className="min-h-0 flex-1 justify-end"
              pointerEvents="box-none"
            >
              <Pressable
                onPress={() => setIsSearchModalOpen(true)}
                className="px-4 pb-3"
              >
                <CompactSearchBar
                  asChild
                  onPress={() => setIsSearchModalOpen(true)}
                />
              </Pressable>
            </View>
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
