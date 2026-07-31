import type { CarDetail } from "@/lib/car-detail-types";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

interface CarInformationAccordionProps {
  readonly car: Pick<
    CarDetail,
    "make" | "model" | "year" | "features" | "transmission" | "passengerCapacity"
  >;
}

/**
 * Expandable summary of non-pricing car attributes (make/model, features,
 * transmission, seating). Mirrors the hireApp car detail info block.
 */
export function CarInformationAccordion({
  car,
}: CarInformationAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View collapsable={false}>
      <Pressable
        onPress={() => setIsOpen((prev) => !prev)}
        className="flex-row items-center justify-between py-2"
        accessibilityRole="button"
        accessibilityLabel="Car information and features"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text className="text-sm font-semibold leading-7 text-gray-900">
          Car information and features
        </Text>
        <ChevronDown
          size={16}
          color="#111827"
          style={{
            transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
          }}
        />
      </Pressable>
      {isOpen && (
        <View
          className="mt-1 border-t border-gray-100 px-4"
          collapsable={false}
        >
          <View className="py-2">
            <Text className="text-sm font-medium leading-6 text-gray-900">
              Make & Model
            </Text>
            <Text className="mt-0.5 text-sm leading-6 text-gray-700">
              {car.make} {car.model} {car.year}
            </Text>
          </View>
          <View className="py-2">
            <Text className="text-sm font-medium leading-6 text-gray-900">
              Features
            </Text>
            <Text className="mt-0.5 text-sm leading-6 text-gray-700">
              {car.features?.length ? car.features.join(", ") : "—"}
            </Text>
          </View>
          <View className="py-2">
            <Text className="text-sm font-medium leading-6 text-gray-900">
              Transmission Type
            </Text>
            <Text className="mt-0.5 text-sm leading-6 text-gray-700">
              {car.transmission ?? "—"}
            </Text>
          </View>
          <View className="py-2">
            <Text className="text-sm font-medium leading-6 text-gray-900">
              Seating Capacity
            </Text>
            <Text className="mt-0.5 text-sm leading-6 text-gray-700">
              {car.passengerCapacity}-seater
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
