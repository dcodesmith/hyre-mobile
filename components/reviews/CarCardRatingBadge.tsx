import { CompactStarRating } from "@/components/reviews/CompactStarRating";
import { Text, View } from "react-native";

/**
 * hireApp CarCard rating pill markup parity:
 * absolute top-3 right-3 px-2 py-1.5 bg-white/90 rounded-full shadow-md
 * flex items-center gap-1.5
 */
export function CarCardRatingBadge({
  averageRating,
  totalReviews,
}: Readonly<{
  averageRating: number;
  totalReviews: number;
}>) {
  if (totalReviews <= 0) {
    return null;
  }

  return (
    <View
      className="absolute right-3 top-3 z-10 flex-row items-center gap-1 rounded-full bg-white/90 px-2 py-1.5 shadow-md"
      accessibilityLabel={`Average rating: ${averageRating.toFixed(1)} out of 5 stars`}
    >
      <CompactStarRating rating={averageRating} size="sm" />
      <Text
        className="text-xs font-medium leading-none text-gray-700"
        style={{ fontSize: 12, lineHeight: 12, includeFontPadding: false }}
      >
        {averageRating.toFixed(1)} ({totalReviews})
      </Text>
    </View>
  );
}
