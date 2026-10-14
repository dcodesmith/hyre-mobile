import { BookingActionDialogs } from "@/components/booking-action-dialogs";
import { BookingActionFeedbackBanner } from "@/components/booking-action-feedback-banner";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";
import { useBookingActionController } from "@/hooks/use-booking-action-controller";
import { useBookings } from "@/hooks/use-bookings";
import {
  formatBookingListDateRange,
  formatBookingListTime,
} from "@/lib/booking-action-form";
import { formatCurrency } from "@/lib/currency";
import {
  BOOKING_STATUSES,
	type BookingsByStatusResponse,
  type BookingStatus,
  type BookingSummary,
} from "@/services/bookings";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Calendar, Clock } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function countBookingsByStatus(
  bookings: BookingsByStatusResponse | undefined,
  status: BookingStatus,
) {
  return bookings?.[status]?.length ?? 0;
}

function BookingListItem({
  booking,
  isRefreshing,
}: Readonly<{
  booking: BookingSummary;
  isRefreshing: boolean;
}>) {
  const router = useRouter();
  const bookingImageUrl = booking.car.images[0]?.url;
  const actions = useBookingActionController(booking, isRefreshing);
  const title = `${booking.car.make} ${booking.car.model}`;
  const dateLabel = formatBookingListDateRange(
    booking.startDate,
    booking.endDate,
  );
  const timeLabel = formatBookingListTime(booking.startDate);

  return (
    <View>
      <Pressable
        onPress={() => router.push(`/bookings/${booking.id}`)}
        className="flex-row items-start gap-2"
      >
        {bookingImageUrl ? (
          <Image
            source={{ uri: bookingImageUrl }}
            contentFit="cover"
            style={{
              width: 68,
              height: 84,
              borderRadius: 4,
              backgroundColor: "#E5E7EB",
            }}
          />
        ) : (
          <View
            aria-hidden
            style={{
              width: 68,
              height: 84,
              borderRadius: 4,
              backgroundColor: "#E5E7EB",
            }}
          />
        )}

        <View className="min-w-0 flex-1 gap-1">
          <Text
            selectable
            className="text-xs font-bold leading-none text-green-600"
          >
            {booking.bookingReference}
          </Text>
          <Text
            selectable
            className="text-sm font-semibold leading-5 text-gray-900"
          >
            {title} ({booking.car.year})
          </Text>
          <Text
            selectable
            className="text-sm font-semibold leading-5 text-gray-900"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatCurrency(Number(booking.totalAmount) || 0)}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <View className="flex-row items-center gap-1">
              <Calendar size={16} color="#111827" />
              <Text selectable className="text-xs leading-5 text-gray-900">
                {dateLabel}
              </Text>
            </View>
            <View className="h-3.5 w-px bg-gray-400" />
            <View className="flex-row items-center gap-1">
              <Clock size={16} color="#111827" />
              <Text selectable className="text-xs leading-5 text-gray-900">
                {timeLabel}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {actions.canEdit || actions.canCancel ? (
        <View className="mt-3 flex-row items-center gap-2">
          {actions.canEdit ? (
            <Button
              className="flex-1"
              variant="outline"
              onPress={actions.openModifyDialog}
              disabled={
                actions.isUpdatingBooking || actions.isCancellingBooking
              }
            >
              <Text className="text-sm font-medium">Modify Booking</Text>
            </Button>
          ) : null}
          {actions.canCancel ? (
            <Button
              className="flex-1"
              variant="destructive"
              onPress={actions.openCancelDialog}
              disabled={
                actions.isCancellingBooking || actions.isUpdatingBooking
              }
            >
              <Text className="text-sm font-semibold text-white">
                {actions.isCancellingBooking
                  ? "Cancelling..."
                  : "Cancel Booking"}
              </Text>
            </Button>
          ) : null}
        </View>
      ) : null}

      <BookingActionFeedbackBanner feedback={actions.feedback} />

      <BookingActionDialogs
        booking={booking}
        controller={actions}
      />
    </View>
  );
}

export default function BookingsScreen() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const { onScroll } = useTabBarVisibility();
  const [activeStatus, setActiveStatus] = useState<BookingStatus>("ACTIVE");
  const bookingsQuery = useBookings(isAuthenticated);

  const bookingsForStatus = useMemo(
    () => bookingsQuery.data?.[activeStatus] ?? [],
    [bookingsQuery.data, activeStatus],
  );
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll(event.nativeEvent.contentOffset.y);
    },
    [onScroll],
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-neutral-950">
            Sign in to view bookings
          </Text>
          <Text className="mt-2 text-center text-sm text-neutral-500">
            Your active, upcoming, and completed bookings are available once you
            log in.
          </Text>
          <Button
            className="mt-5 w-full max-w-[220px]"
            onPress={openLoginModal}
          >
            <Text className="text-sm font-semibold text-white">Sign In</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (bookingsQuery.isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
          <Text className="mt-2 text-sm text-neutral-500">
            Loading your bookings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (bookingsQuery.error) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-red-700">
            Unable to load bookings
          </Text>
          <Text className="mt-2 text-center text-sm text-red-600">
            Please check your connection and try again.
          </Text>
          <Button
            className="mt-5 w-full max-w-[220px]"
            onPress={() => bookingsQuery.refetch()}
          >
            <Text className="text-sm font-semibold text-white">Retry</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View className="px-4 py-4">
          <Text className="mb-4 text-2xl font-semibold leading-9 tracking-tight text-gray-900">
            Bookings
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-4"
          >
            {BOOKING_STATUSES.map((status) => {
              const active = status === activeStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setActiveStatus(status)}
                  className={[
                    "shrink-0 flex-row items-center justify-center rounded border px-3 py-1.5",
                    active
                      ? "border-gray-900 bg-gray-900"
                      : "border-gray-300 bg-white",
                  ].join(" ")}
                  style={{
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <Text
                    className={[
                      "text-xs font-medium leading-5",
                      active ? "text-white" : "text-gray-900",
                    ].join(" ")}
                    style={{
                      includeFontPadding: false,
                    }}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()} (
                    {countBookingsByStatus(bookingsQuery.data, status)})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View
            className="mt-4 rounded-lg border border-gray-200 bg-white p-4"
            style={{
              borderRadius: 8,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
            }}
          >
            {bookingsForStatus.length === 0 ? (
              <View className="py-8">
                <Text className="text-center text-sm text-gray-500">
                  No {activeStatus.toLowerCase()} bookings
                </Text>
              </View>
            ) : (
              bookingsForStatus.map((booking, index) => (
                <View key={booking.id}>
                  {index > 0 ? (
                    <View className="my-4 h-px w-full bg-gray-200" />
                  ) : null}
                  <BookingListItem
                    booking={booking}
                    isRefreshing={bookingsQuery.isFetching}
                  />
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
