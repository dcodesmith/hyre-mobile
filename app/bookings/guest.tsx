import { useQueryClient } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { guestBookingAsDetail } from "@/lib/guest-booking";
import {
  fetchGuestBooking,
  isInvalidGuestBookingAccessError,
} from "@/services/guest-booking-access";
import {
  deleteGuestBookingSession,
  saveGuestBookingSession,
} from "@/storage/guest-booking-session";

export default function GuestBookingExchangeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token: tokenParam } = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const exchangeToken = async () => {
      if (!token) {
        router.replace(
          "/bookings/lookup?status=invalid-link" as Href,
        );
        return;
      }

      try {
        const booking = await fetchGuestBooking(token, {
          signal: controller.signal,
        });
        if (!isActive || controller.signal.aborted) return;
        if (Date.parse(booking.accessExpiresAt) <= Date.now()) {
          router.replace(
            "/bookings/lookup?status=invalid-link" as Href,
          );
          return;
        }
        await saveGuestBookingSession({
          bookingId: booking.bookingId,
          token,
          accessExpiresAt: booking.accessExpiresAt,
        });
        if (!isActive || controller.signal.aborted) {
          await deleteGuestBookingSession(booking.bookingId, token);
          return;
        }
        queryClient.setQueryData(
          ["guest-booking", booking.bookingId],
          guestBookingAsDetail(booking),
        );
        if (isActive) router.replace(`/bookings/${booking.bookingId}`);
      } catch (error) {
        if (!isActive) return;
        const status = isInvalidGuestBookingAccessError(error)
          ? "invalid-link"
          : "unavailable";
        router.replace(`/bookings/lookup?status=${status}` as Href);
      }
    };

    void exchangeToken();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [queryClient, router, token]);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <ActivityIndicator size="large" color="#6B7280" />
        <Text selectable className="text-sm text-neutral-600">
          Opening booking...
        </Text>
      </View>
    </SafeAreaView>
  );
}
