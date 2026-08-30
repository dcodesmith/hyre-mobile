import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "expo-router";
import { CalendarClock } from "lucide-react-native";
import { Text } from "react-native";

export function BookingExtendCard({ bookingId }: { bookingId: string }) {
  const router = useRouter();

  return (
    <Card className="rounded-xl py-4">
      <CardContent className="px-4">
        <Button
          onPress={() =>
            router.push(`/bookings/${encodeURIComponent(bookingId)}/extend`)
          }
        >
          <CalendarClock size={16} color="#FFFFFF" />
          <Text className="text-sm font-semibold text-white">Extend Trip</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
