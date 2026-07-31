import { fetchCarReviews } from "@/services/reviews";
import { useQuery } from "@tanstack/react-query";

const CAR_REVIEWS_QUERY_KEY = ["car-reviews"] as const;

export function useCarReviews(
  carId: string | undefined,
  options?: {
    page?: number;
    limit?: number;
    includeRatings?: boolean;
  },
) {
  return useQuery({
    queryKey: [
      ...CAR_REVIEWS_QUERY_KEY,
      carId,
      options?.page ?? 1,
      options?.limit ?? 5,
      options?.includeRatings ?? true,
    ],
    queryFn: ({ signal }) => {
      if (!carId) {
        throw new Error("Car ID is required to fetch reviews");
      }
      return fetchCarReviews(
        {
          carId,
          page: options?.page,
          limit: options?.limit,
          includeRatings: options?.includeRatings,
        },
        { signal },
      );
    },
    enabled: !!carId,
    staleTime: 2 * 60 * 1000,
  });
}
