import { getJson } from "@/lib/api-client";

const REVIEWS_ENDPOINT = "/api/reviews";

export type RatingDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type AggregatedRatings = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistribution;
};

export type CarReview = {
  id: string;
  overallRating: number;
  carRating: number;
  chauffeurRating: number | null;
  serviceRating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
};

export type CarReviewsResponse = {
  reviews: CarReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  ratings?: AggregatedRatings;
};

export async function fetchCarReviews(
  params: {
    carId: string;
    page?: number;
    limit?: number;
    includeRatings?: boolean;
  },
  init?: RequestInit,
): Promise<CarReviewsResponse> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 5),
    includeRatings: String(params.includeRatings ?? true),
  });

  return getJson<CarReviewsResponse>(
    `${REVIEWS_ENDPOINT}/car/${params.carId}?${search.toString()}`,
    init,
  );
}
