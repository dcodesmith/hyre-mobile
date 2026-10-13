import { Platform, type ViewStyle } from "react-native";

/**
 * hireApp AutocompleteAddress PopoverContent:
 * `bg-white shadow-md rounded-md p-2 z-[100] text-sm` — no border.
 *
 * Tailwind shadow-md:
 * 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
 */
export const AUTOCOMPLETE_POPOVER_STYLE: ViewStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: 6, // rounded-md
  padding: 8, // p-2
  borderWidth: 0,
  ...Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
};

/**
 * hireApp AutocompleteFlight uses ui/popover base which keeps
 * `border border-neutral-200` + shadow-md.
 */
export const FLIGHT_AUTOCOMPLETE_POPOVER_STYLE: ViewStyle = {
  ...AUTOCOMPLETE_POPOVER_STYLE,
  borderWidth: 1,
  borderColor: "#E5E5E5", // neutral-200
};

/**
 * hireApp flight PopoverContent: base `rounded-lg shadow-md ring-1 ring-foreground/10`
 * plus `p-1`. Options are `p-2 text-sm` (36px row) with `gap-2.5` between them.
 */
export const INLINE_FLIGHT_MENU_STYLE: ViewStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: 8,
  padding: 4,
  borderWidth: 1,
  borderColor: "rgba(9, 9, 11, 0.10)",
  ...Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
};
