import { PromotionalPriceRow, PromotionBadge } from "@/components/promotion";
import { CarCardRatingBadge } from "@/components/reviews";
import type { CarPromotion } from "@/lib/car-types";
import { hasActivePromotion } from "@/lib/promotion-utils";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useCallback, useRef } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// hireApp: Plus Jakarta Sans, text-lg=18px, text-sm=14px
const FONT = {
  semiBold: "PlusJakartaSans-SemiBold",
  regular: "PlusJakartaSans-Regular",
};
const CARD_WIDTH = 220;
const CARD_GAP = 16;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;

export type VehicleItem = {
  id: string;
  make: string;
  model: string;
  year: number;
  dayRate: number;
  images: string[];
  seats: number;
  fuelIncluded?: boolean;
  averageRating: number;
  totalReviews: number;
  promotion?: CarPromotion | null;
};

export type VehicleCarouselSectionProps = {
  readonly title: string;
  readonly searchQuery: string;
  readonly vehicles: VehicleItem[];
};

export function VehicleCarouselSection({
  title,
  searchQuery,
  vehicles,
}: VehicleCarouselSectionProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const currentScrollXRef = useRef(0);
  const contentWidthRef = useRef(0);
  const viewportWidthRef = useRef(0);

  const scroll = useCallback((direction: "left" | "right") => {
    const maxScrollX = Math.max(
      0,
      contentWidthRef.current - viewportWidthRef.current,
    );
    const delta = direction === "left" ? -SCROLL_STEP : SCROLL_STEP;
    const nextX = Math.max(
      0,
      Math.min(maxScrollX, currentScrollXRef.current + delta),
    );
    scrollRef.current?.scrollTo({ x: nextX, animated: true });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      currentScrollXRef.current = event.nativeEvent.contentOffset.x;
    },
    [],
  );

  return (
    <View>
      {/* Header: mb-2, title text-lg (18px) font-semibold, arrow h-8 w-8 */}
      <View className="mb-2 flex-row items-center justify-between">
        <Pressable
          onPress={() =>
            router.push(searchQuery ? `/search?${searchQuery}` : "/search")
          }
          className="flex-row items-center gap-2"
        >
          <Text
            className="text-gray-900"
            style={{ fontFamily: FONT.semiBold, fontSize: 18 }}
          >
            {title}
          </Text>
          <View className="size-8 items-center justify-center rounded-full border border-input bg-background">
            <ChevronRight size={16} color="#111827" strokeWidth={2} />
          </View>
        </Pressable>

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => scroll("left")}
            className="size-8 items-center justify-center rounded-full border border-input bg-background"
          >
            <ChevronLeft size={16} color="#6B7280" strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => scroll("right")}
            className="size-8 items-center justify-center rounded-full border border-input bg-background"
          >
            <ChevronRight size={16} color="#6B7280" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Car cards: w-[220px] gap-4, rounded-xl */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingRight: 16 }}
        className="-mx-4 px-4"
        onScroll={handleScroll}
        onContentSizeChange={(width) => {
          contentWidthRef.current = width;
        }}
        onLayout={(event) => {
          viewportWidthRef.current = event.nativeEvent.layout.width;
        }}
        scrollEventThrottle={16}
      >
        {vehicles.map((car) => (
          <Pressable
            key={car.id}
            onPress={() => router.push(`/cars/${car.id}`)}
            className="w-[220px] shrink-0"
          >
            <View className="relative overflow-hidden rounded-xl">
              <Image
                source={{ uri: car.images[0] }}
                style={{ width: 220, height: 165, backgroundColor: "#E5E7EB" }}
                contentFit="cover"
              />
              {hasActivePromotion(car.promotion) ? (
                <View className="absolute left-2 top-2 z-10">
                  <PromotionBadge
                    discountPercent={car.promotion.discountValue}
                    compact
                  />
                </View>
              ) : null}
              <CarCardRatingBadge
                averageRating={car.averageRating}
                totalReviews={car.totalReviews}
              />
              <View
                style={{
                  position: "absolute",
                  right: 8,
                  bottom: 8,
                  backgroundColor: "rgba(0,0,0,0.7)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text className="text-xs font-medium text-white">
                  1/{car.images.length}
                </Text>
              </View>
            </View>
            <View className="mt-3">
              <Text
                className="tracking-wider text-gray-900"
                style={{ fontFamily: FONT.semiBold, fontSize: 14 }}
              >
                {car.make} {car.model} ({car.year})
              </Text>
              {/* Web: flex text-xs items-center gap-1.5 text-gray-600 - N-Seater • Fuel Included */}
              <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
                <Text
                  className="text-xs text-gray-600"
                  style={{ fontFamily: FONT.regular }}
                >
                  {car.seats}-Seater
                </Text>
                {car.fuelIncluded && (
                  <>
                    <Text className="text-xs text-gray-600">•</Text>
                    <Text
                      className="text-xs text-gray-600"
                      style={{ fontFamily: FONT.regular }}
                    >
                      Fuel Included
                    </Text>
                  </>
                )}
              </View>
              <View className="mt-0.5">
                <PromotionalPriceRow
                  listRate={car.dayRate}
                  promotion={car.promotion}
                  suffix="/ day"
                  size="sm"
                />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
