import { buildCategorySearchQuery } from "@/lib/category-search-query";
import type {
  CarCategoriesResponse,
  PublicCar,
} from "@/lib/car-types";
import { hasActivePromotion } from "@/lib/promotion-utils";

export type HomeCarSection = {
  key: string;
  title: string;
  searchQuery: string;
  cars: PublicCar[];
};

export function buildHomeCarSections(
  fleet: CarCategoriesResponse,
): HomeCarSection[] {
  if (fleet.allCars.length === 0) {
    return [];
  }

  const onSaleCars = fleet.allCars.filter((car) =>
    hasActivePromotion(car.promotion),
  );

  return [
    ...(onSaleCars.length > 0
      ? [
          {
            key: "on-sale",
            title: "On Sale",
            searchQuery: "dealsOnly=true",
            cars: onSaleCars,
          },
        ]
      : []),
    ...fleet.categories.map((category) => ({
      key: category.name,
      title: category.title,
      searchQuery: buildCategorySearchQuery(category),
      cars: category.cars,
    })),
    {
      key: "all",
      title: "All vehicles",
      searchQuery: "",
      cars: fleet.allCars,
    },
  ];
}
