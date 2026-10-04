import { BookingSearch } from "@/components/booking-search";
import { useCarCategories } from "@/hooks/use-car-categories";
import type { PublicCar } from "@/lib/car-types";
import { buildHomeCarSections } from "@/lib/home-car-sections";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Fingerprint, ShieldCheck } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  VehicleCarouselSection,
  type VehicleItem,
} from "./vehicle-carousel-section";

// Hero from hireApp: hero-640.webp (mobile), height 540px (matches web useHeroScroll)
const HERO_IMAGE = require("@/assets/images/hero.webp");

// Web: h-4 w-4 text-green-400, text-orange-400 (no rounded bg wrapper)
const FEATURES = [
  {
    key: "fleetOwners",
    label: "Vetted fleet owners",
    Icon: ShieldCheck,
    color: "#4ade80",
  }, // green-400
  {
    key: "booking",
    label: "Secure booking",
    Icon: Fingerprint,
    color: "#fb923c",
  }, // orange-400
];

// hireApp uses Plus Jakarta Sans - Expo font names for StyleSheet typography
const FONT = {
  semiBold: "PlusJakartaSans-SemiBold" as const,
  medium: "PlusJakartaSans-Medium" as const,
  regular: "PlusJakartaSans-Regular" as const,
};
const VEHICLE_SKELETON_IDS = ["one", "two", "three"] as const;

const styles = StyleSheet.create({
  heroImage: {
    minHeight: 540,
    overflow: "hidden" as const,
  },
  badge: {
    fontFamily: FONT.medium,
    fontSize: 14,
  },
  pill: {
    fontFamily: FONT.medium,
    fontSize: 12, // text-xs
    lineHeight: 16,
    includeFontPadding: false,
  },
  pillPressable: {
    minHeight: 32,
  },
  aiButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#404040", // neutral-700/900 approximate
  },
  subtitleColor: { color: "rgba(255,255,255,0.9)" },
  /** Replaces deprecated `StyleSheet.absoluteFillObject` (RN parity: full-bleed overlay). */
  gradientFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  heroImageFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
/** Transform API car to VehicleItem for carousel */
function toVehicleItem(car: PublicCar): VehicleItem {
  return {
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    dayRate: car.dayRate,
    images: car.images.map((img) => img.url),
    seats: car.passengerCapacity,
    fuelIncluded: car.pricingIncludesFuel,
    averageRating: car.averageRating,
    totalReviews: car.totalReviews,
    promotion: car.promotion ?? undefined,
  };
}

function LoadingVehicleSectionSkeleton() {
  return (
    <View className="gap-3 animate-pulse">
      <View className="h-8 w-40 rounded-full bg-gray-200/80" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingRight: 16 }}
        className="-mx-4 px-4"
      >
        {VEHICLE_SKELETON_IDS.map((id) => (
          <View key={`vehicle-skeleton-${id}`} className="w-[220px] shrink-0">
            <View className="h-[165px] rounded-xl bg-gray-200/80" />
            <View className="mt-3 gap-2">
              <View className="h-4 w-44 rounded bg-gray-200/80" />
              <View className="h-3 w-28 rounded bg-gray-200/80" />
              <View className="h-4 w-24 rounded bg-gray-200/80" />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function BookingHero() {
  const { data, isPending, refetch, isRefetching } = useCarCategories();
  let carouselContent: ReactNode;
  if (data) {
    const sections = buildHomeCarSections(data);

    carouselContent =
      sections.length > 0 ? (
        <View className="gap-6">
          {sections.map((section) => (
            <VehicleCarouselSection
              key={section.key}
              title={section.title}
              searchQuery={section.searchQuery}
              vehicles={section.cars.map(toVehicleItem)}
            />
          ))}
        </View>
      ) : (
        <View className="items-center justify-center py-12">
          <Text className="text-sm text-gray-600">
            No vehicles available right now
          </Text>
        </View>
      );
  } else if (isPending) {
    carouselContent = (
      <View className="gap-6 py-2">
        <LoadingVehicleSectionSkeleton />
        <LoadingVehicleSectionSkeleton />
      </View>
    );
  } else {
    carouselContent = (
      <View className="items-center justify-center gap-3 py-12">
        <Text className="text-sm text-red-500">Failed to load vehicles</Text>
        <Pressable
          onPress={() => refetch()}
          disabled={isRefetching}
          className="rounded-full bg-gray-900 px-4 py-2"
        >
          <Text className="text-sm font-medium text-white">
            {isRefetching ? "Retrying..." : "Try again"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="relative w-full">
      <View style={[styles.heroImage, { zIndex: 10 }]}>
        <Image
          source={HERO_IMAGE}
          contentFit="cover"
          style={styles.heroImageFill}
          transition={0}
        />
        {/* Gradient overlay: from-black/50 via-black/30 to-black/60 */}
        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
          locations={[0, 0.5, 1]}
          style={styles.gradientFill}
        />

        {/* Hero content: px-4 pt-16, max-w-4xl (web: max-w-4xl mx-auto) */}
        <View className="relative z-10 w-full max-w-4xl self-center px-4 pt-16 pb-6">
          {/* Title - matches web: text-3xl font-bold text-white text-center mb-3 */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-white text-center mb-3">
              Your Ride, Your Choice
            </Text>
            <Text
              className="text-center text-base leading-relaxed"
              style={styles.subtitleColor}
            >
              Comfort. Safety. Professional. Every ride.
            </Text>
          </View>

          {/* Search box wrapper: z-20 so it stays above the overlapping -mt-20 white section */}
          <View className="relative z-20 w-full max-w-2xl gap-3">
            <BookingSearch context="hero" />

            {/* AISearchModal trigger: gap-2 px-4 py-2 text-sm font-medium */}
            {/* <View className="items-center">
              <Pressable style={styles.aiButton}>
                <Sparkles color="#FFFFFF" size={16} strokeWidth={1.75} />
                <Text className="text-white" style={styles.badge}>
                  Search by AI
                </Text>
              </Pressable>
            </View> */}
          </View>

          {/* Trust badges: flex-wrap gap-4 mt-6, icons h-4 w-4 (web: no rounded bg) */}
          <View className="mt-6 flex-row flex-wrap items-center justify-center gap-4">
            {FEATURES.map(({ key, label, Icon, color }) => (
              <View className="flex-row items-center gap-2" key={key}>
                <Icon color={color} size={16} strokeWidth={1.75} />
                <Text className="text-white" style={styles.badge}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Main content: -mt-20 overlap, pt-28 pushes pills below hero with more spacing */}
      <View className="relative z-0 -mt-20 bg-white px-4 pt-28 pb-28">
        {/* Category pills: px-3 py-1.5 gap-2, text-xs font-medium */}
        {data && data.categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            className="-mx-4 px-4 mb-6"
          >
            {data.categories.map((category) => (
              <Pressable
                key={category.name}
                className="shrink-0 flex-row items-center justify-center rounded-full border border-gray-300 bg-white px-3"
                style={styles.pillPressable}
              >
                <Text
                  className="whitespace-nowrap text-gray-700"
                  style={styles.pill}
                >
                  {category.title} ({category.cars.length})
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Carousel sections - dynamically rendered from API */}
        {carouselContent}
      </View>
    </View>
  );
}

export default BookingHero;
