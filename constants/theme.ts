/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.vercel.app/), [unistyles](https://reactnativeunistyles.vercel.app/), etc.
 */

import { isExpoIos, isExpoWeb } from "@/lib/expo-platform";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

const fontsWeb = {
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  rounded:
    "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
  mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const;

const fontsIos = {
  /** iOS `UIFontDescriptorSystemDesignDefault` */
  sans: "system-ui",
  /** iOS `UIFontDescriptorSystemDesignSerif` */
  serif: "ui-serif",
  /** iOS `UIFontDescriptorSystemDesignRounded` */
  rounded: "ui-rounded",
  /** iOS `UIFontDescriptorSystemDesignMonospaced` */
  mono: "ui-monospace",
} as const;

const fontsDefault = {
  sans: "normal",
  serif: "serif",
  rounded: "normal",
  mono: "monospace",
} as const;

export const Fonts = isExpoWeb
  ? fontsWeb
  : isExpoIos
    ? fontsIos
    : fontsDefault;
