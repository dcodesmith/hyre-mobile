import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { Animated, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";

/** Order must match the tab screens in `app/(tabs)/_layout.tsx`. */
const AUTH_TAB_ORDER = ["index", "bookings", "referrals", "profile", "logout"] as const;
const GUEST_TAB_ORDER = ["index", "login"] as const;

export function CustomTabBar(props: Readonly<BottomTabBarProps>) {
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBarVisibility();
  const { isAuthenticated, isLoggingOut, logout } = useAuth();
  const bottomInset = Math.max(16, insets.bottom);

  const tabOrder = isAuthenticated ? AUTH_TAB_ORDER : GUEST_TAB_ORDER;
  const visibleRoutes = tabOrder
    .map((name) => props.state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof props.state.routes)[number] => r != null);

  const activeTab = props.state.routes[props.state.index];

  const isCompactGuestNav = visibleRoutes.length <= 2;
  const innerRowClassName = isCompactGuestNav
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
      <View className={innerRowClassName}>
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
      </View>
    </Animated.View>
  );
}
