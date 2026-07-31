import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { View } from "react-native";

/**
 * Placeholder screen for the Logout tab. When navigated to, triggers logout
 * and redirects to home (handled by auth provider).
 */
export default function LogoutScreen() {
  const { logout } = useAuth();

  useEffect(() => {
    void logout();
  }, [logout]);

  return <View />;
}
