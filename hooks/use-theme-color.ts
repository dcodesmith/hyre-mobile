import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof THEME.light & keyof typeof THEME.dark,
) {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme ?? "light";
  const colorFromProps = props[theme];

  return colorFromProps ?? THEME[theme][colorName];
}
