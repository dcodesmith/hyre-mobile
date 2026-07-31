import { useCarReviews } from "@/hooks/use-car-reviews";
import { cn } from "@/lib/utils";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import * as DialogPrimitive from "@rn-primitives/dialog";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAX_REVIEW_PREVIEW = 12;

function formatRating(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatReviewDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function RatingStars({
  rating,
  size = "sm",
}: Readonly<{ rating: number; size?: "sm" | "md" }>) {
  const rounded = Math.max(1, Math.min(5, Math.round(rating)));
  const stars = "★".repeat(rounded);
  const emptyStars = "★".repeat(Math.max(0, 5 - rounded));
  return (
    <Text
      className={cn(
        "tracking-[1px] leading-none",
        size === "md" ? "text-sm" : "text-xs",
      )}
    >
      <Text className="text-gray-900">{stars}</Text>
      <Text className="text-neutral-300">{emptyStars}</Text>
    </Text>
  );
}

export function CarReviewsSection({ carId }: Readonly<{ carId: string }>) {
  const [open, setOpen] = useState(false);
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reviewsQuery = useCarReviews(carId, {
    limit: MAX_REVIEW_PREVIEW,
    includeRatings: true,
  });

  if (reviewsQuery.isError || !reviewsQuery.data) {
    return null;
  }

  const { reviews, ratings } = reviewsQuery.data;
  const totalReviews = ratings?.totalReviews ?? reviews.length;
  if (totalReviews === 0) {
    return null;
  }

  const averageRating = ratings?.averageRating ?? 0;
  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count =
      ratings?.ratingDistribution?.[
        stars as keyof typeof ratings.ratingDistribution
      ] ?? 0;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { stars, count, percentage };
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <Pressable
        onPress={() => setOpen(true)}
        className="w-full flex-row items-center justify-center gap-6 px-4 pb-2 pt-4"
        accessibilityRole="button"
        accessibilityLabel="Open car reviews"
      >
        <View className="flex-col items-center">
          <Text className="text-sm leading-none text-gray-900">
            {formatRating(averageRating)}
          </Text>
          <RatingStars rating={averageRating} size="sm" />
        </View>
        <View className="h-8 w-px bg-gray-300" />
        <View className="flex-col items-center">
          <Text className="text-sm leading-none text-gray-900">
            {totalReviews}
          </Text>
          <Text className="text-sm leading-none text-gray-800">
            {totalReviews === 1 ? "Review" : "Reviews"}
          </Text>
        </View>
      </Pressable>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="absolute inset-0 z-50 flex flex-1 items-end justify-center bg-black/50"
          asChild
        >
          <NativeOnlyAnimatedView
            entering={SlideInDown.duration(220)}
            exiting={SlideOutDown.duration(180)}
            className="w-full flex-1 justify-end"
          >
            <DialogPrimitive.Content
              className="w-full flex-col rounded-t-3xl border-0 bg-white px-4 pt-3 shadow-lg"
              style={{
                height: Math.min(screenHeight * 0.92, screenHeight - Math.max(8, insets.top)),
                paddingBottom: Math.max(16, insets.bottom),
              }}
              pointerEvents="auto"
            >
              <View className="mb-2 items-center">
                <View className="h-1 w-12 rounded-full bg-gray-300" />
              </View>
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-xl font-medium text-gray-900">
                  Reviews
                </Text>
                <DialogPrimitive.Close
                  className="rounded-full p-1 active:bg-gray-100"
                >
                  <X size={18} color="#374151" />
                </DialogPrimitive.Close>
              </View>
              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View className="gap-2">
                  <View className="mb-1 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-lg font-semibold text-gray-900">
                        {formatRating(averageRating)}
                      </Text>
                      <RatingStars rating={averageRating} size="md" />
                    </View>
                    <Text className="text-sm text-gray-600">
                      {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                    </Text>
                  </View>

                  {ratingBreakdown.map((item) => (
                    <View
                      key={item.stars}
                      className="flex-row items-center gap-3"
                    >
                      <Text className="w-3 text-sm text-gray-700">
                        {item.stars}
                      </Text>
                      <View className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <View
                          className="h-full bg-gray-900"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </View>
                      <Text className="w-5 text-right text-sm text-gray-500">
                        {item.count}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="my-4 border-t border-gray-100" />

                <View className="gap-4 pb-3">
                  {reviews.map((review) => (
                    <View
                      key={review.id}
                      className="gap-2 border-b border-gray-100 pb-4 last:border-b-0"
                    >
                      <View className="flex-row items-center gap-2">
                        {review.user.image ? (
                          <Image
                            source={{ uri: review.user.image }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: "#E5E7EB",
                            }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                            <Text className="text-xs font-semibold text-gray-700">
                              {review.user.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}

                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-900">
                            {review.user.name}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {formatReviewDate(review.createdAt)}
                          </Text>
                        </View>
                        <RatingStars rating={review.overallRating} size="md" />
                      </View>
                      {review.comment ? (
                        <Text className="text-sm leading-5 text-gray-700">
                          {review.comment}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </DialogPrimitive.Content>
          </NativeOnlyAnimatedView>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
