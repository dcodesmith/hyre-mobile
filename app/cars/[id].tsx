import { CarImageCarousel } from "@/components/car-detail/CarImageCarousel";
import { CarInformationAccordion } from "@/components/car-detail/CarInformationAccordion";
import { CarReviewsSection } from "@/components/car-detail/CarReviewsSection";
import { PromotionalPriceRow } from "@/components/promotion";
import { useCarDetail } from "@/hooks/use-car-detail";
import { hasActivePromotion } from "@/lib/promotion-utils";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CarDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const carId = typeof params.id === "string" ? params.id : "";
  const carQuery = useCarDetail(carId, { from: params.from });

  if (carQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!carQuery.data || carQuery.isError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-white px-6">
        <Text className="text-center text-sm text-red-500">
          Unable to load this vehicle.
        </Text>
        <Pressable
          onPress={() => carQuery.refetch()}
          className="rounded-full bg-gray-900 px-4 py-2"
        >
          <Text className="text-sm font-medium text-white">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const car = carQuery.data;
  const promotion = hasActivePromotion(car.promotion) ? car.promotion : null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <CarImageCarousel
          images={car.images}
          carName={`${car.make} ${car.model}`}
          promotionDiscountPercent={promotion?.discountValue}
        />
        <View className="gap-4 px-4 py-5">
          <View>
            <Text className="text-xl font-semibold text-gray-900">
              {car.make} {car.model} ({car.year})
            </Text>
            <Text className="mt-1 text-sm text-gray-600">
              {car.passengerCapacity}-seater
            </Text>
            <View className="mt-2">
              <PromotionalPriceRow
                listRate={car.dayRate}
                promotion={promotion}
                suffix="/ day"
              />
            </View>
          </View>
          {car.description ? (
            <Text className="text-sm leading-6 text-gray-700">
              {car.description}
            </Text>
          ) : null}
          <CarInformationAccordion car={car} />
          <CarReviewsSection carId={car.id} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
