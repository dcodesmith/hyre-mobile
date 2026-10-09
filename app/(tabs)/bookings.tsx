import { BookingActionDialogs } from "@/components/booking-action-dialogs";
import { BookingActionFeedbackBanner } from "@/components/booking-action-feedback-banner";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";
import { useBookingActionController } from "@/hooks/use-booking-action-controller";
import { useBookings } from "@/hooks/use-bookings";
import { formatBookingDateTime } from "@/lib/booking-action-form";
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
  isLast,
  isRefreshing,
}: Readonly<{
  booking: BookingSummary;
  isLast: boolean;
  isRefreshing: boolean;
}>) {
  const router = useRouter();
  const bookingImageUrl = booking.car.images[0]?.url;
  const actions = useBookingActionController(booking, isRefreshing);

  return (
    <View
      className={isLast ? "px-3 py-4" : "border-b border-neutral-200 px-3 py-4"}
    >
      <Pressable
        onPress={() => router.push(`/bookings/${booking.id}`)}
        className="flex-row items-center gap-3"
      >
        {bookingImageUrl ? (
          <Image
            source={{ uri: bookingImageUrl }}
            contentFit="cover"
            style={{
              width: 60,
              height: 60,
              borderRadius: 999,
              backgroundColor: "#F5F5F5",
            }}
          />
        ) : (
          <View
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: "#F5F5F5",
            }}
          />
        )}

        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1">
            <Text selectable className="text-sm font-semibold text-neutral-900">
              {booking.car.make} {booking.car.model} ({booking.car.year})
            </Text>
            <Text selectable className="text-sm italic text-neutral-500">
              - {booking.bookingReference}
            </Text>
          </View>

          <Text selectable className="mt-1 text-sm text-neutral-600">
            {formatBookingDateTime(booking.startDate)}
          </Text>
          <Text selectable className="mt-0.5 text-sm text-neutral-600">
            {formatBookingDateTime(booking.endDate)}
          </Text>

          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <Text selectable className="text-sm font-semibold text-neutral-900">
              {formatCurrency(Number(booking.totalAmount) || 0)}
            </Text>
          </View>
        </View>

        {/* <ChevronRight size={16} color="#6B7280" /> */}
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
          <Text className="text-2xl font-bold text-neutral-950">
            Your Bookings
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerClassName="gap-2"
          >
            {BOOKING_STATUSES.map((status) => {
              const active = status === activeStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => setActiveStatus(status)}
                  className={[
                    "min-h-10 flex-row items-center justify-center rounded-md border px-3",
                    active
                      ? "border-neutral-900 bg-neutral-900"
                      : "border-neutral-200 bg-white",
                  ].join(" ")}
                >
                  <Text
                    className={[
                      "text-sm font-medium",
                      active ? "text-white" : "text-neutral-700",
                    ].join(" ")}
                    style={{
                      includeFontPadding: false,
                      lineHeight: 20,
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
            className="mt-4 rounded border border-neutral-200 bg-white"
            style={{
              borderCurve: "continuous",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
            }}
          >
            {bookingsForStatus.length === 0 ? (
              <View className="px-4 py-10">
                <Text className="text-center text-sm text-neutral-500">
                  No {activeStatus.toLowerCase()} bookings.
                </Text>
              </View>
            ) : (
              bookingsForStatus.map((booking, index) => (
                <BookingListItem
                  key={booking.id}
                  booking={booking}
                  isLast={index === bookingsForStatus.length - 1}
									isRefreshing={bookingsQuery.isFetching}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
