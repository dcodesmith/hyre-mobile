import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import type { Href } from "expo-router";
import { usePathname, useRouter } from "expo-router";
import {
  Calendar,
  Gift,
  Home,
  LogIn,
  LogOut,
  User,
} from "lucide-react-native";
import type { ComponentType, ReactNode } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";

/** Order must match the tab screens in `app/(tabs)/_layout.tsx`. */
const AUTH_TAB_ORDER = [
  "index",
  "bookings",
  "referrals",
  "profile",
  "logout",
] as const;
const GUEST_TAB_ORDER = ["index", "login"] as const;

const SEARCH_TAB_HREFS: Record<string, Href | null> = {
  index: "/",
  bookings: "/bookings",
  referrals: "/referrals",
  profile: "/profile",
  login: "/login",
  logout: null,
};

const SEARCH_TAB_LABELS: Record<string, string> = {
  index: "Tripdly",
  bookings: "Bookings",
  referrals: "Referrals",
  profile: "Profile",
  login: "Log in",
  logout: "Logout",
};

const SEARCH_TAB_ICONS: Record<
  string,
  ComponentType<{ size?: number; color: string; strokeWidth?: number }>
> = {
  index: Home,
  bookings: Calendar,
  referrals: Gift,
  profile: User,
  login: LogIn,
  logout: LogOut,
};

function isSearchTabFocused(name: string, pathname: string): boolean {
  if (name === "index") return pathname === "/";
  if (name === "login") return pathname.startsWith("/login");
  return pathname === `/${name}`;
}

function FloatingTabBarChrome({
  compact,
  children,
}: {
  readonly compact: boolean;
  readonly children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBarVisibility();
  const bottomInset = Math.max(16, insets.bottom);
  const innerRowClassName = compact
    ? "flex-row items-center justify-around w-full max-w-[448px] self-center px-24 py-2 min-h-[52px]"
    : "flex-row items-center justify-around w-full self-center px-4 py-2 min-h-[52px]";

  return (
    <Animated.View
      className="absolute left-4 right-4 z-40 rounded-full border border-border/50 bg-white"
      style={[
        {
          bottom: bottomInset,
          backgroundColor: "#FFFFFF",
          // iOS: soft, mostly-downward shadow (equivalent to Tailwind shadow-lg)
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 10 },
              shadowRadius: 15,
            },
            // Android elevation on rounded-full with `overflow:hidden` produces hard
            // rectangular side shadows. Keep elevation low so the shadow stays inside
            // the pill silhouette.
            android: { elevation: 2 },
            default: {},
          }),
        },
        { transform: [{ translateY }] },
      ]}
    >
      <View className={innerRowClassName}>{children}</View>
    </Animated.View>
  );
}

export function CustomTabBar(props: Readonly<BottomTabBarProps>) {
  const { isAuthenticated, isLoggingOut, logout } = useAuth();
  const tabOrder = isAuthenticated ? AUTH_TAB_ORDER : GUEST_TAB_ORDER;
  const visibleRoutes = tabOrder
    .map((name) => props.state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof props.state.routes)[number] => r != null);
  const activeTab = props.state.routes[props.state.index];

  return (
    <FloatingTabBarChrome compact={visibleRoutes.length <= 2}>
      {visibleRoutes.map((route) => {
        const descriptor = props.descriptors[route.key];
        if (!descriptor) {
          return null;
        }
        const { options } = descriptor;
        const focused = activeTab?.key === route.key;
        const isLogoutRoute = route.name === "logout";

        const onPress = () => {
          const event = props.navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          // Avoid navigating to the placeholder logout screen (which renders an
          // empty view while logout runs) to prevent a brief blank-page flash.
          if (isLogoutRoute) {
            if (!event.defaultPrevented && !isLoggingOut) {
              void logout();
            }
            return;
          }
          if (!focused && !event.defaultPrevented) {
            props.navigation.dispatch({
              ...CommonActions.navigate({
                name: route.name,
                merge: true,
              }),
              target: props.state.key,
            });
          }
        };

        const onLongPress = () => {
          props.navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const color = focused
          ? (options.tabBarActiveTintColor ?? "#18181B")
          : (options.tabBarInactiveTintColor ?? "#71717A");

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            disabled={isLogoutRoute && isLoggingOut}
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={null}
            className="flex-col items-center justify-center py-2 px-1 min-w-0 flex-1"
          >
            {options.tabBarIcon
              ? options.tabBarIcon({
                  color,
                  focused,
                  size: 16,
                })
              : null}
            {typeof options.tabBarLabel === "function"
              ? options.tabBarLabel({
                  focused,
                  color,
                  position: "below-icon",
                  children: options.title ?? route.name,
                })
              : null}
          </Pressable>
        );
      })}
    </FloatingTabBarChrome>
  );
}

/** Same pill as the tab bar, for stack screens that sit above `(tabs)`. */
export function SearchTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoggingOut, logout } = useAuth();
  const tabOrder = isAuthenticated ? AUTH_TAB_ORDER : GUEST_TAB_ORDER;

  return (
    <FloatingTabBarChrome compact={tabOrder.length <= 2}>
      {tabOrder.map((name) => {
        const Icon = SEARCH_TAB_ICONS[name];
        const href = SEARCH_TAB_HREFS[name];
        if (!Icon) {
          return null;
        }
        const focused = isSearchTabFocused(name, pathname);
        const isLogout = name === "logout";
        const color = focused ? "#18181B" : "#71717A";
        const label =
          isLogout && isLoggingOut ? "Logging out…" : SEARCH_TAB_LABELS[name];

        return (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            disabled={isLogout && isLoggingOut}
            onPress={() => {
              if (isLogout) {
                if (!isLoggingOut) {
                  void logout();
                }
                return;
              }
              if (href && !focused) {
                router.replace(href);
              }
            }}
            android_ripple={null}
            className="flex-col items-center justify-center py-2 px-1 min-w-0 flex-1"
          >
            <View
              className="mb-1 size-6 items-center justify-center"
              style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}
            >
              <Icon size={16} color={color} strokeWidth={2} />
            </View>
            <Text
              numberOfLines={1}
              className="max-w-full text-center text-xs font-medium"
              style={{ color }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </FloatingTabBarChrome>
  );
}
