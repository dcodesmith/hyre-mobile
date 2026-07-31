import { PromotionBadge } from "@/components/promotion";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CarImageCarouselProps {
  readonly images: { url: string }[];
  readonly carName: string;
  /** hireApp-style “10% OFF” pill on hero when a promotion applies. */
  readonly promotionDiscountPercent?: number | null;
}

export function CarImageCarousel({
  images,
  carName,
  promotionDiscountPercent,
}: CarImageCarouselProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageHeight = useMemo(() => Math.round((width * 3) / 4), [width]);
  const topControlsOffset = Math.max(insets.top + 8, 16);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderImage = useCallback(
    ({ item, index }: ListRenderItemInfo<{ url: string }>) => (
      <View style={{ width, height: imageHeight }}>
        <Image
          source={{ uri: item.url }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
          transition={200}
          accessibilityLabel={`${carName} - Image ${index + 1} of ${images.length}`}
        />
      </View>
    ),
    [carName, imageHeight, images.length, width],
  );

  const keyExtractor = useCallback(
    (_: { url: string }, index: number) => `image-${index}`,
    [],
  );

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      setCurrentIndex(index);
    },
    [width],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<{ url: string }> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  return (
    <View
      className="relative overflow-hidden rounded-xl"
      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
    >
      {images.length === 0 ? (
        <View
          className="bg-gray-200 items-center justify-center"
          style={{ width, height: imageHeight }}
        >
          <Text className="text-gray-500">No images available</Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={getItemLayout}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="start"
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
        />
      )}

      {/* Back button overlay */}
      <Pressable
        onPress={handleBack}
        className="absolute left-4 z-10 bg-black/50 p-2 rounded-full active:bg-black/70"
        style={{ top: topControlsOffset }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft color="#FFFFFF" size={20} strokeWidth={2} />
      </Pressable>

      {promotionDiscountPercent != null && promotionDiscountPercent > 0 ? (
        <View
          className="absolute right-4 z-10"
          style={{ top: topControlsOffset }}
          pointerEvents="none"
        >
          <PromotionBadge discountPercent={promotionDiscountPercent} compact />
        </View>
      ) : null}

      {/* Image counter badge */}
      {images.length > 0 ? (
        <View className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 rounded-md">
          <Text className="text-xs font-medium text-white">
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
