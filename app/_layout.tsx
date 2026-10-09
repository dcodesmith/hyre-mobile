import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from "@expo-google-fonts/geist";
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from "@expo-google-fonts/nunito-sans";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import NetInfo from "@react-native-community/netinfo";
import { ThemeProvider } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Stack, useNavigationContainerRef } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import type { TextStyle } from "react-native";
import { AppState, LogBox, StyleSheet, Text, TextInput } from "react-native";
import { AutocompletePortalHostProvider } from "@/providers/autocomplete-portal-host-provider";
import "react-native-reanimated";
import "../global.css";

import { BookingSearchDraftProvider } from "@/components/booking-search";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  initializeTelemetry,
  registerTelemetryNavigationContainer,
} from "@/lib/telemetry";
import { NAV_THEME } from "@/lib/theme";
import { AuthModalProvider } from "@/providers/auth-modal-provider";

export { RouteErrorBoundary as ErrorBoundary } from "@/components/route-error-boundary";

initializeTelemetry();

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  /SafeAreaView/,
  /Cannot update a component.*CssInterop/,
]);

const PLUS_JAKARTA_BY_WEIGHT: Record<string, string> = {
  "100": "PlusJakartaSans-Regular",
  "200": "PlusJakartaSans-Regular",
  "300": "PlusJakartaSans-Regular",
  "400": "PlusJakartaSans-Regular",
  "500": "PlusJakartaSans-Medium",
  "600": "PlusJakartaSans-SemiBold",
  "700": "PlusJakartaSans-Bold",
  "800": "PlusJakartaSans-Bold",
  "900": "PlusJakartaSans-Bold",
  normal: "PlusJakartaSans-Regular",
  bold: "PlusJakartaSans-Bold",
};

type RenderableTextComponent = {
  render?: (props: unknown, ref: unknown) => unknown;
  __plusJakartaPatched?: boolean;
};

const resolvePlusJakartaFamily = (fontWeight: TextStyle["fontWeight"]) => {
  if (fontWeight == null) return "PlusJakartaSans-Regular";
  const key = String(fontWeight);
  return PLUS_JAKARTA_BY_WEIGHT[key] ?? "PlusJakartaSans-Regular";
};

/** Tailwind / CSS uses "Plus Jakarta Sans"; iOS only knows Expo-registered PostScript names. */
const PLUS_JAKARTA_CSS_NAME = "Plus Jakarta Sans";

function shouldForcePlusJakarta(family: string | undefined): boolean {
  if (family == null || family === PLUS_JAKARTA_CSS_NAME) return true;
  if (family.startsWith("PlusJakartaSans")) return true;
  return false;
}

function shouldOptOutOfPlusJakarta(family: string | undefined): boolean {
  if (family == null) return false;
  if (family === "System") return true;
  if (/nunito/i.test(family)) return true;
  if (/mono|Menlo|Courier|Consolas/i.test(family)) return true;
  return false;
}

function computePlusJakartaTextStyle(
  flat: TextStyle,
): Pick<TextStyle, "fontFamily" | "fontWeight"> {
  const fam = typeof flat.fontFamily === "string" ? flat.fontFamily : undefined;
  const w = flat.fontWeight;
  const fromWeight = resolvePlusJakartaFamily(w);

  if (shouldOptOutOfPlusJakarta(fam)) {
    return { fontFamily: fam, fontWeight: w };
  }

  if (!shouldForcePlusJakarta(fam)) {
    return { fontFamily: fam, fontWeight: w };
  }

  if (fam == null || fam === PLUS_JAKARTA_CSS_NAME) {
    return { fontFamily: fromWeight, fontWeight: undefined };
  }

  // Expo face name + Tailwind fontWeight: upgrade Regular → Bold/SemiBold/etc.
  if (fam.startsWith("PlusJakartaSans")) {
    const wStr = w == null ? "400" : String(w);
    const isNormalWeight =
      wStr === "400" || wStr === "normal" || w === undefined;
    if (isNormalWeight) {
      return { fontFamily: fam, fontWeight: undefined };
    }
    return { fontFamily: fromWeight, fontWeight: undefined };
  }

  return { fontFamily: fromWeight, fontWeight: undefined };
}

const patchGlobalTextFontFamily = () => {
  for (const Component of [Text, TextInput] as const) {
    const target = Component as unknown as RenderableTextComponent;
    if (target.__plusJakartaPatched) continue;
    const originalRender = target.render;
    if (typeof originalRender !== "function") continue;

    target.render = function patchedRender(rawProps: unknown, ref: unknown) {
      const incoming = (rawProps ?? {}) as { style?: TextStyle };
      const flat: TextStyle = StyleSheet.flatten(incoming.style) ?? {};
      const next = computePlusJakartaTextStyle(flat);

      const unchanged =
        next.fontFamily === flat.fontFamily &&
        next.fontWeight === flat.fontWeight;
      if (unchanged) {
        return originalRender(rawProps, ref);
      }

      return originalRender(
        {
          ...incoming,
          style: [incoming.style, next],
        },
        ref,
      );
    };

    target.__plusJakartaPatched = true;
  }
};

patchGlobalTextFontFamily();

WebBrowser.maybeCompleteAuthSession();
void SplashScreen.preventAutoHideAsync();

// Sync React Query with network status - queries pause when offline
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected ?? true);
  });
});

// Keep React Query focus state in sync with native foreground/background state.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) => {
    setFocused(state === "active");
  });

  return () => subscription.remove();
});

export const unstable_settings = {
  anchor: "(tabs)",
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayout() {
  const { colorScheme } = useColorScheme();
  const navigationRef = useNavigationContainerRef();
  const [fontsLoaded, fontError] = useFonts({
    "Geist-Regular": Geist_400Regular,
    "Geist-Medium": Geist_500Medium,
    "Geist-SemiBold": Geist_600SemiBold,
    "NunitoSans-Regular": NunitoSans_400Regular,
    "NunitoSans-Medium": NunitoSans_500Medium,
    "NunitoSans-SemiBold": NunitoSans_600SemiBold,
    "NunitoSans-Bold": NunitoSans_700Bold,
    "PlusJakartaSans-Regular": PlusJakartaSans_400Regular,
    "PlusJakartaSans-Medium": PlusJakartaSans_500Medium,
    "PlusJakartaSans-SemiBold": PlusJakartaSans_600SemiBold,
    "PlusJakartaSans-Bold": PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    registerTelemetryNavigationContainer(navigationRef);
  }, [fontError, fontsLoaded, navigationRef]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME[colorScheme ?? "light"]}>
        <AuthModalProvider>
          <BookingSearchDraftProvider>
            <AutocompletePortalHostProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="search"
                  options={{ headerShown: false, title: "Search" }}
                />
                <Stack.Screen
                  name="cars/[id]"
                  options={{ headerShown: false, title: "Car Details" }}
                />
                <Stack.Screen
                  name="bookings/lookup"
                  options={{ headerShown: false, title: "Find your booking" }}
                />
                <Stack.Screen
                  name="bookings/guest"
                  options={{ headerShown: false, title: "Opening booking" }}
                />
                <Stack.Screen
                  name="bookings/[id]"
                  options={{ headerShown: false, title: "Booking Details" }}
                />
                <Stack.Screen
                  name="bookings/[id]/extend"
                  options={{ headerShown: false, title: "Extend Trip" }}
                />
                <Stack.Screen
                  name="payment-status"
                  options={{ headerShown: false, title: "Payment Status" }}
                />
                <Stack.Screen
                  name="extension-payment-status"
                  options={{ headerShown: false, title: "Payment Status" }}
                />
                <Stack.Screen
                  name="phone-verification"
                  options={{
                    gestureEnabled: false,
                    headerShown: false,
                    title: "Verify phone",
                  }}
                />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
                />
              </Stack>
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            </AutocompletePortalHostProvider>
          </BookingSearchDraftProvider>
        </AuthModalProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
