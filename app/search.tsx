import { CompactSearchBar, SearchSheet } from "@/components/booking-search";
import { SearchTabBar } from "@/components/custom-tab-bar";
import { PromotionalPriceRow, PromotionBadge } from "@/components/promotion";
import { CarCardRatingBadge } from "@/components/reviews";
import { SearchFilters } from "@/components/search-filters";
import { TabBarVisibilityProvider, useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useCarSearch } from "@/hooks/use-car-search";
import { useSearchJourneyRoute } from "@/hooks/use-search-journey-route";
import type { CarSearchParams, SearchCar } from "@/lib/car-types";
import { hasActivePromotion } from "@/lib/promotion-utils";
import {
  buildResultsHeading,
  countActiveSearchFilters,
  parseSearchFilters,
  routeParamsToSearchParams,
  searchFiltersToParams,
} from "@/lib/search-filters";
import { parseSearchId } from "@/lib/search-id";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const SEARCH_SKELETON_IDS = [1, 2, 3];

/** Query keys copied from `/search` onto `/cars/[id]` when opening a vehicle. */
const CAR_DETAIL_NAV_PARAM_KEYS = [
  "searchId",
  "bookingType",
  "from",
  "to",
  "pickupTime",
  "flightNumber",
] as const;

function VehicleCard({
  car,
  bookingType,
  onPress,
}: {
  readonly car: SearchCar;
  readonly bookingType?: string;
  readonly onPress: () => void;
}) {
  // Get rate based on booking type
  const getRate = () => {
    switch (bookingType) {
      case "NIGHT":
        return car.nightRate ?? car.dayRate;
      case "FULL_DAY":
        return car.fullDayRate ?? car.dayRate;
      case "AIRPORT_PICKUP":
        return car.airportPickupRate ?? car.dayRate;
      default:
        return car.dayRate;
    }
  };

  const getRateLabel = () => {
    switch (bookingType) {
      case "NIGHT":
        return "/ night";
      case "FULL_DAY":
        return "/ full day";
      case "AIRPORT_PICKUP":
        return "/ trip";
      default:
        return "/ day";
    }
  };

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-xl active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`View ${car.make} ${car.model}`}
    >
      <View className="relative">
        <Image
          source={{ uri: car.images[0]?.url }}
          className="w-full bg-gray-200"
          style={{ aspectRatio: 4 / 3 }}
          contentFit="cover"
        />
        {hasActivePromotion(car.promotion) ? (
          <View className="absolute left-3 top-3 z-10">
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
        <View className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-1">
          <Text className="text-xs font-medium text-white">
            1 / {car.images.length}
          </Text>
        </View>
      </View>
      <View className="mt-3">
        <Text className="text-sm font-semibold tracking-wider text-gray-900">
          {car.make} {car.model} ({car.year})
        </Text>
        <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
          <Text className="text-xs text-gray-600">
            {car.passengerCapacity}-Seater
          </Text>
          {car.pricingIncludesFuel && (
            <>
              <Text className="text-xs text-gray-600">•</Text>
              <Text className="text-xs text-gray-600">Fuel Included</Text>
            </>
          )}
        </View>
        <View className="mt-0.5">
          <PromotionalPriceRow
            listRate={getRate()}
            promotion={car.promotion}
            suffix={getRateLabel()}
            size="sm"
          />
        </View>
      </View>
    </Pressable>
  );
}

function VehicleCardSkeleton() {
  return (
    <View className="animate-pulse">
      <View
        className="w-full rounded-xl bg-gray-200/80"
        style={{ aspectRatio: 4 / 3 }}
      />
      <View className="mt-3 gap-2">
        <View className="h-4 w-52 rounded bg-gray-200/80" />
        <View className="h-3 w-32 rounded bg-gray-200/80" />
        <View className="h-4 w-28 rounded bg-gray-200/80" />
      </View>
    </View>
  );
}

function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useTabBarVisibility();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const params = useLocalSearchParams<{
    searchId?: string;
    from?: string;
    to?: string;
    bookingType?: string;
    pickupTime?: string;
    flightNumber?: string;
    vehicleType?: string;
    serviceTier?: string;
    make?: string;
    minPrice?: string;
    maxPrice?: string;
    minCapacity?: string;
    fuelIncluded?: string;
    dealsOnly?: string;
    q?: string;
  }>();

  // Non-filter query params, shared by the results fetch and the live count.
  const baseParams = useMemo<CarSearchParams>(() => {
    const normalizedBookingType = params.bookingType
      ?.toUpperCase()
      .replace("-", "_");
    const journeySearchId = parseSearchId(params.searchId);
    const payload: CarSearchParams = {
      from: params.from,
      to: params.to,
      bookingType: normalizedBookingType,
      pickupTime: params.pickupTime,
      flightNumber: params.flightNumber,
      q: params.q,
      limit: 12,
      ...(journeySearchId ? { searchId: journeySearchId } : {}),
    };

    // Night bookings are fixed-start; keep payload explicit if query omitted pickupTime.
    if (payload.bookingType === "NIGHT" && !payload.pickupTime) {
      payload.pickupTime = "11 PM";
    }

    return payload;
  }, [
    params.bookingType,
    params.flightNumber,
    params.from,
    params.pickupTime,
    params.q,
    params.searchId,
    params.to,
  ]);

  const appliedFilters = useMemo(
    () => parseSearchFilters(routeParamsToSearchParams(params)),
    [params],
  );

  const activeFilterCount = countActiveSearchFilters(appliedFilters);

  const searchPayload = useMemo<CarSearchParams>(
    () => ({
      ...baseParams,
      ...searchFiltersToParams(appliedFilters),
      page: 1,
    }),
    [baseParams, appliedFilters],
  );

  const { data, isLoading, error, refetch, isRefetching, isFetchedAfterMount } =
    useCarSearch(searchPayload);
  const activeSearchId = useSearchJourneyRoute({
    routeSearchId: params.searchId,
    resultSearchId: isFetchedAfterMount ? data?.searchId : undefined,
  });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll(event.nativeEvent.contentOffset.y);
    },
    [onScroll],
  );

  const cars = data?.cars ?? [];
  const pagination = data?.pagination;
  const facets = data?.facets ?? null;

  const renderResultsContent = () => {
    const vehicleCount = pagination?.total ?? cars.length;
    const vehicleLabel = buildResultsHeading(
      vehicleCount,
      data?.filters.vehicleTypes ?? appliedFilters.vehicleTypes,
    );

    let resultsBody: ReactNode;
    if (error) {
      resultsBody = (
        <View className="items-center justify-center gap-3 py-12">
          <Text className="text-sm text-red-500">
            Failed to search vehicles
          </Text>
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
    } else if (isLoading) {
      resultsBody = (
        <View className="gap-6">
          {SEARCH_SKELETON_IDS.map((id) => (
            <VehicleCardSkeleton key={`search-skeleton-${id}`} />
          ))}
        </View>
      );
    } else if (cars.length === 0) {
      resultsBody = (
        <View className="items-center justify-center py-12">
          <Text className="text-sm text-gray-500">
            No vehicles match your search
          </Text>
        </View>
      );
    } else {
      resultsBody = (
        <View className="gap-6">
          {cars.map((car) => (
            <VehicleCard
              key={car.id}
              car={car}
              bookingType={searchPayload.bookingType}
              onPress={() => {
                const carParams = new URLSearchParams();
                for (const key of CAR_DETAIL_NAV_PARAM_KEYS) {
                  const value = key === "searchId" ? activeSearchId : params[key];
                  if (value) carParams.set(key, value);
                }

                const queryString = carParams.toString();
                const url = queryString
                  ? `/cars/${car.id}?${queryString}`
                  : `/cars/${car.id}`;
                router.push(url as `/cars/${string}`);
              }}
            />
          ))}
        </View>
      );
    }

    return (
      <>
        <View className="mb-4 w-full flex-row items-center justify-between gap-4">
          {isLoading ? (
            <View className="h-6 flex-1 rounded bg-gray-200/80 animate-pulse" />
          ) : (
            <Text className="flex-1 text-sm font-semibold text-gray-900">
              {vehicleLabel}
            </Text>
          )}
          <SearchFilters
            facets={facets}
            baseParams={baseParams}
            bookingType={baseParams.bookingType}
            activeFilterCount={activeFilterCount}
          />
        </View>
        {resultsBody}
      </>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        {/* Header paints through the top inset, same gray as the home scrolled bar. */}
        <View
          className="flex-row items-center gap-3 border-b border-gray-200 bg-gray-100 px-4 pb-3"
          style={{ paddingTop: Math.max(insets.top, 24) + 12 }}
        >
          <Pressable
            onPress={() => router.back()}
            className="p-1"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft color="#374151" size={24} strokeWidth={2} />
          </Pressable>
          <View className="flex-1">
            <CompactSearchBar
              onPress={() => setIsSearchModalOpen(true)}
              appliedSearch={{
                from: params.from,
                to: params.to,
                bookingType: params.bookingType,
                pickupTime: params.pickupTime,
                flightNumber: params.flightNumber,
              }}
            />
          </View>
        </View>

        <SearchSheet
          open={isSearchModalOpen}
          onOpenChange={setIsSearchModalOpen}
          searchId={activeSearchId}
        />

        {/* Results */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 pb-28"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {renderResultsContent()}
        </ScrollView>
      </SafeAreaView>
      <SearchTabBar />
    </View>
  );
}

export default function SearchScreenRoute() {
  return (
    <TabBarVisibilityProvider>
      <SearchScreen />
    </TabBarVisibilityProvider>
  );
}
