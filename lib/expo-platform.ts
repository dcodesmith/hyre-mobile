import { Platform } from "react-native";

/**
 * `process.env.EXPO_OS` is compile-time when available, but it may be absent
 * in some native runtime/build paths. Fall back to Platform.OS so native-only
 * features (like push token registration) still execute on device.
 */
export type ExpoOs = "ios" | "android" | "web";

const platformOs = Platform.OS;
const expoEnvOs = process.env.EXPO_OS as ExpoOs | undefined;
export const expoOs =
  expoEnvOs === "ios" || expoEnvOs === "android" || expoEnvOs === "web"
    ? expoEnvOs
    : platformOs;

export const isExpoWeb = expoOs === "web";
export const isExpoIos = expoOs === "ios";
export const isExpoAndroid = expoOs === "android";
/** True for iOS and Android bundles (not web). */
export const isExpoNative = expoOs === "ios" || expoOs === "android";
