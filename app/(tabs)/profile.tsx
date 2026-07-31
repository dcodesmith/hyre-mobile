import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-lg font-semibold text-neutral-900">Profile</Text>
        {user?.email && (
          <Text className="mt-2 text-muted-foreground">{user.email}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
