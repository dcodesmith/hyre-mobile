/**
 * Utility to create React Native style objects from Tailwind classes.
 * Use for third-party components that accept style props (e.g. tabBarItemStyle).
 *
 * @example
 * twStyle("flex-col py-2 px-0.5 min-w-0 flex-1 items-center justify-center")
 */
import { style } from "twrnc";

export const twStyle = style;
