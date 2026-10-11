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

// hyre-web mobile hero: size-4 (16px), default Lucide stroke, Tailwind v4 green-400 / orange-400
const FEATURES = [
  {
    key: "fleetOwners",
    label: "Vetted fleet owners",
    Icon: ShieldCheck,
    color: "#05df72",
  },
  {
    key: "booking",
    label: "Secure booking",
    Icon: Fingerprint,
    color: "#ff8904",
  },
];

// hireApp uses Plus Jakarta Sans - Expo font names for StyleSheet typography
const FONT = {
  bold: "PlusJakartaSans-Bold" as const,
  semiBold: "PlusJakartaSans-SemiBold" as const,
  medium: "PlusJakartaSans-Medium" as const,
  regular: "PlusJakartaSans-Regular" as const,
};
const VEHICLE_SKELETON_IDS = ["one", "two", "three"] as const;

const styles = StyleSheet.create({
  heroImage: {
    height: 411,
    overflow: "hidden" as const,
  },
  featureLabel: {
    fontFamily: "Geist-Medium",
    fontSize: 14,
    lineHeight: 14,
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
  heroImageFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gradientFill: {
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
      <View className="relative w-full pb-[22px]">
        <View className="absolute top-0 right-0 left-0" style={styles.heroImage}>
          <Image
            source={HERO_IMAGE}
            contentFit="cover"
            style={styles.heroImageFill}
            transition={0}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
            locations={[0, 0.5, 1]}
            style={styles.gradientFill}
          />
        </View>

        <View className="items-center px-4 pt-[122px]">
          <Text
            className="text-center text-white"
            style={{
              fontFamily: FONT.bold,
              fontSize: 30,
              lineHeight: 30,
              letterSpacing: -0.43,
            }}
          >
            Your Ride, Your Choice
          </Text>
          <Text
            className="mt-2 w-full max-w-[337px] text-center text-white"
            style={{
              fontFamily: FONT.semiBold,
              fontSize: 14,
              lineHeight: 24,
              letterSpacing: -0.43,
            }}
          >
            Comfort. Safety. Professional. Every ride.
          </Text>
        </View>

        <View className="mx-4 mt-[93px]">
          <BookingSearch />
        </View>

        <View className="mt-2 self-center h-8 flex-row items-center gap-5 rounded-full px-4 py-2">
          {FEATURES.map(({ key, label, Icon, color }) => (
            <View className="flex-row items-center gap-1" key={key}>
              <Icon color={color} size={16} strokeWidth={2} />
              <Text className="text-gray-700" style={styles.featureLabel}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="bg-white px-4 pb-28">
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
