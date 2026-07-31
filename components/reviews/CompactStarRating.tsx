import { useState } from "react";
import { Text, View } from "react-native";

/**
 * hireApp compact `StarRating`: ★ with fill % = rating/5.
 *
 * Native ★ glyphs sit below the Latin cap-height that `items-center` uses,
 * so we optically shift up to match hireApp's web `align-middle` look.
 */
export function CompactStarRating({
  rating,
  size = "sm",
}: Readonly<{
  rating: number;
  size?: "sm" | "md";
}>) {
  const clamped = Math.max(0, Math.min(5, rating));
  const fillPercent = clamped / 5;
  const fontSize = size === "md" ? 14 : 12;
  const sizeClass = size === "md" ? "text-sm" : "text-xs";
  const [glyphWidth, setGlyphWidth] = useState(fontSize);

  return (
    <View
      className="flex-row items-center justify-center"
      style={{ height: fontSize, transform: [{ translateY: -2 }] }}
    >
      <View className="relative" style={{ width: glyphWidth, height: fontSize }}>
        <Text
          className={`${sizeClass} text-neutral-300`}
          style={{
            fontSize,
            lineHeight: fontSize,
            includeFontPadding: false,
          }}
          onLayout={(event) => {
            const measured = event.nativeEvent.layout.width;
            if (measured > 0 && measured !== glyphWidth) {
              setGlyphWidth(measured);
            }
          }}
        >
          ★
        </Text>
        {fillPercent > 0 ? (
          <View
            pointerEvents="none"
            className="absolute left-0 top-0 overflow-hidden"
            style={{ width: glyphWidth * fillPercent, height: fontSize }}
          >
            <Text
              className={`${sizeClass} text-gray-900`}
              style={{
                fontSize,
                lineHeight: fontSize,
                width: glyphWidth,
                includeFontPadding: false,
              }}
            >
              ★
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
