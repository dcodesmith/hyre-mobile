import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Text } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuthContext } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
	const colorScheme = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
				headerShown: false,
				tabBarButton: HapticTab,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Tripdly",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="house.fill" color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name="enter"
				options={{
					title: "Enter",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="house.fill" color={color} />
					),
					// This will immediately open the modal route instead of showing "Enter"
					tabBarButton: (props) => (
						<HapticTab
							{...props}
							onPress={(event) => {
								event.preventDefault();
								// Navigate to the modal screen at /modal
								props.onPress?.(event);
								// @ts-ignore: expo-router navigation
								props.navigation?.navigate("modal");
							}}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="login"
				options={{
					title: "Account",
					tabBarLabel: (props) => <LoginTabLabel {...props} />,
					tabBarIcon: (props) => <LoginTabIcon {...props} />,
					tabBarButton: (props) => <LoginTabButton {...props} />,
				}}
			/>
		</Tabs>
	);
}

const LoginTabIcon = ({ color }: { color: string }) => {
	const { isAuthenticated } = useAuthContext();

	return (
		<IconSymbol
			size={26}
			name={
				isAuthenticated
					? "rectangle.portrait.and.arrow.right.fill"
					: "rectangle.portrait.and.arrow.right"
			}
			color={color}
		/>
	);
};

const LoginTabLabel = ({ color }: { color: string }) => {
	const { isAuthenticated } = useAuthContext();

	return (
		<Text style={{ color, fontSize: 12 }}>
			{isAuthenticated ? "Log out" : "Log in"}
		</Text>
	);
};

const LoginTabButton = (props: BottomTabBarButtonProps) => {
	const { isAuthenticated, openLoginModal, logout, isLoggingOut } =
		useAuthContext();

	return (
		<HapticTab
			{...props}
			onPress={(event) => {
				event.preventDefault();
				if (!isAuthenticated) {
					openLoginModal();
					return;
				}

				if (!isLoggingOut) {
					void logout();
				}
			}}
		/>
	);
};
