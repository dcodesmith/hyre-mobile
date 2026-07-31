import { CustomTabBar } from "@/components/custom-tab-bar";
import { Text } from "@/components/ui/text";
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";
import { THEME } from "@/lib/theme";
import { twStyle } from "@/lib/tw-style";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs, useSegments } from "expo-router";
import { Home, LogIn, LogOut, User } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import { View } from "react-native";

const HREF_TAB_ITEM_STYLE = twStyle(
  "flex-col items-center justify-center py-2 px-1 min-w-0 flex-1",
);

type TabLabelProps = {
  color: string;
  focused: boolean;
};

function TabLabelInner({
  label,
  color,
  focused,
}: TabLabelProps & { label: string }) {
  return (
    <Text
      numberOfLines={1}
      className={
        focused
          ? "text-xs max-w-full font-medium text-black text-center"
          : "text-xs max-w-full font-medium text-center"
      }
      style={{ color }}
    >
      {label}
    </Text>
  );
}

function createTabLabel(label: string) {
  const TabLabelRenderer = ({ color, focused }: TabLabelProps) => (
    <TabLabelInner label={label} color={color} focused={focused} />
  );
  TabLabelRenderer.displayName = `TabLabel(${label})`;
  return TabLabelRenderer;
}

const HOME_TAB_LABEL = createTabLabel("Tripdly");
const PROFILE_TAB_LABEL = createTabLabel("Profile");
const LOGOUT_TAB_LABEL = createTabLabel("Logout");

function TabLayoutContent() {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const { showTabBar } = useTabBarVisibility();
  const primary = THEME.light.primary;
  const mutedForeground = THEME.light.mutedForeground;

  useEffect(() => {
    const isLoginTab = (segments as string[]).includes("login");
    if (isLoginTab) {
      showTabBar();
    }
  }, [segments, showTabBar]);

  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => <CustomTabBar {...props} />,
    [],
  );

  const TabIcon = useCallback(
    (
      IconComponent: React.ComponentType<{
        size?: number;
        color: string;
        strokeWidth?: number;
      }>,
      color: string,
      focused: boolean,
    ) => (
      <View
        className="size-6 mb-1 flex items-center justify-center"
        style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}
      >
        <IconComponent size={16} color={color} strokeWidth={2} />
      </View>
    ),
    [],
  );

  const LoginTabIconMemo = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) =>
      TabIcon(LogIn, color, focused),
    [TabIcon],
  );

  const LoginTabLabelMemo = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <Text
        numberOfLines={1}
        className={
          focused
            ? "text-xs max-w-full font-semibold text-center"
            : "text-xs max-w-full font-medium text-center"
        }
        style={{ color }}
      >
        Log in
      </Text>
    ),
    [],
  );

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: mutedForeground,
        tabBarShowLabel: true,
        headerShown: false,
        tabBarStyle: twStyle("border-t-0 w-full"),
        tabBarItemStyle: twStyle(
          "flex-col items-center justify-center py-2 px-1 min-w-0 flex-1",
        ),
        tabBarIconStyle: twStyle("w-6 h-6 flex items-center justify-center"),
        tabBarLabelStyle: twStyle("text-xs max-w-full text-center"),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tripdly",
          tabBarIcon: ({ color, focused }) => TabIcon(Home, color, focused),
          tabBarItemStyle: HREF_TAB_ITEM_STYLE,
          tabBarLabel: HOME_TAB_LABEL,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => TabIcon(User, color, focused),
          tabBarLabel: PROFILE_TAB_LABEL,
          tabBarItemStyle: HREF_TAB_ITEM_STYLE,
          href: isAuthenticated ? "/profile" : null,
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: "Logout",
          tabBarIcon: ({ color, focused }) => TabIcon(LogOut, color, focused),
          tabBarLabel: LOGOUT_TAB_LABEL,
          tabBarItemStyle: HREF_TAB_ITEM_STYLE,
          href: isAuthenticated ? "/logout" : null,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          title: "Account",
          tabBarLabel: LoginTabLabelMemo,
          tabBarIcon: LoginTabIconMemo,
          tabBarItemStyle: HREF_TAB_ITEM_STYLE,
          href: isAuthenticated ? null : "/login",
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <TabBarVisibilityProvider>
      <TabLayoutContent />
    </TabBarVisibilityProvider>
  );
}
