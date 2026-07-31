import { TimePicker } from "@/components/booking-search/TimePicker";
import { AddressAutocompleteInput } from "@/components/ui/address-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";
import { useBookingActions } from "@/hooks/use-booking-actions";
import { useBookings } from "@/hooks/use-bookings";
import { DAY_BOOKING_TYPE } from "@/lib/booking-types";
import { formatCurrency } from "@/lib/currency";
import {
  BOOKING_STATUSES,
  getBookingActionErrorMessage,
  type BookingStatus,
  type BookingSummary,
  type BookingsByStatusResponse,
  type UpdateBookingPayload,
} from "@/services/bookings";
import { format, toZonedTime } from "date-fns-tz";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useReducer, useState } from "react";
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LAGOS_TIMEZONE = "Africa/Lagos";
const BOOKING_EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

const formatDateTime = (value: string) => {
  return format(toZonedTime(new Date(value), LAGOS_TIMEZONE), "PPPp");
};

const isBookingEditable = (startDate: string) => {
  return new Date(startDate).getTime() - Date.now() >= BOOKING_EDIT_WINDOW_MS;
};

function countBookingsByStatus(
  bookings: BookingsByStatusResponse | undefined,
  status: BookingStatus,
) {
  return bookings?.[status]?.length ?? 0;
}

type BookingActionFeedback = {
  type: "success" | "error";
  message: string;
};

type BookingListItemState = {
  isModifyDialogOpen: boolean;
  isCancelDialogOpen: boolean;
  actionFeedback: BookingActionFeedback | null;
  pickupTime: string;
  pickupAddress: string;
  sameLocation: boolean;
  dropOffAddress: string;
};

type BookingListItemAction = {
  type: "patch";
  payload: Partial<BookingListItemState>;
};

const initialBookingListItemState: BookingListItemState = {
  isModifyDialogOpen: false,
  isCancelDialogOpen: false,
  actionFeedback: null,
  pickupTime: "",
  pickupAddress: "",
  sameLocation: true,
  dropOffAddress: "",
};

function bookingListItemReducer(
  state: BookingListItemState,
  action: BookingListItemAction,
): BookingListItemState {
  if (action.type === "patch") {
    return { ...state, ...action.payload };
  }
  return state;
}

function ModifyBookingDialog({
  booking,
  open,
  onOpenChange,
  pickupTime,
  setPickupTime,
  pickupAddress,
  setPickupAddress,
  sameLocation,
  setSameLocation,
  dropOffAddress,
  setDropOffAddress,
  isSubmitting,
  onSubmit,
}: Readonly<{
  booking: BookingSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickupTime: string;
  setPickupTime: (value: string) => void;
  pickupAddress: string;
  setPickupAddress: (value: string) => void;
  sameLocation: boolean;
  setSameLocation: (value: boolean) => void;
  dropOffAddress: string;
  setDropOffAddress: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}>) {
  const isDayBooking = booking.type === DAY_BOOKING_TYPE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modify Booking</DialogTitle>
          <DialogDescription>
            {isDayBooking
              ? "Edit the pickup time, pickup address, and drop-off address."
              : "Edit the pickup and drop-off address."}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-3">
          {isDayBooking ? (
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-slate-900">
                Pickup Time
              </Text>
              <TimePicker
                date={new Date(booking.startDate)}
                value={pickupTime}
                onValueChange={setPickupTime}
                bookingType={booking.type}
                variant="form"
                placeholder="Select pickup time"
              />
            </View>
          ) : null}

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-slate-900">
              Pickup Address
            </Text>
            <AddressAutocompleteInput
              value={pickupAddress}
              onChangeText={setPickupAddress}
              placeholder="Enter pickup address"
            />
          </View>

          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={sameLocation}
              onCheckedChange={(checked) => {
                const isChecked = checked === true;
                setSameLocation(isChecked);
                if (isChecked) setDropOffAddress("");
              }}
            />
            <Text className="text-sm text-slate-700">
              Drop-off location same as pickup
            </Text>
          </View>

          {sameLocation ? null : (
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-slate-900">
                Drop-off Address
              </Text>
              <AddressAutocompleteInput
                value={dropOffAddress}
                onChangeText={setDropOffAddress}
                placeholder="Enter drop-off address"
              />
            </View>
          )}
        </View>

        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <Text className="text-sm font-medium">Cancel</Text>
          </Button>
          <Button onPress={onSubmit} disabled={isSubmitting}>
            <Text className="text-sm font-semibold text-white">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelBookingDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}>) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this booking? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <Text className="text-sm font-medium">No</Text>
          </Button>
          <Button
            variant="destructive"
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            <Text className="text-sm font-semibold text-white">
              {isSubmitting ? "Cancelling..." : "Yes, Cancel Booking"}
            </Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingListItem({
  booking,
  isLast,
}: Readonly<{ booking: BookingSummary; isLast: boolean }>) {
  const router = useRouter();
  const {
    updateBooking,
    cancelBooking,
    isUpdatingBooking,
    isCancellingBooking,
  } = useBookingActions(booking.id);
  const [state, dispatch] = useReducer(
    bookingListItemReducer,
    initialBookingListItemState,
  );
  const {
    isModifyDialogOpen,
    isCancelDialogOpen,
    actionFeedback,
    pickupTime,
    pickupAddress,
    sameLocation,
    dropOffAddress,
  } = state;

  const canBeModified =
    booking.status === "CONFIRMED" && isBookingEditable(booking.startDate);
  const canBeCancelled =
    ["PENDING", "CONFIRMED"].includes(booking.status) &&
    isBookingEditable(booking.startDate);
  const bookingImageUrl = booking.car.images[0]?.url;

  const openModifyDialog = () => {
    const hasSameLocation = booking.pickupLocation === booking.returnLocation;
    dispatch({
      type: "patch",
      payload: {
        pickupTime: format(
          toZonedTime(new Date(booking.startDate), LAGOS_TIMEZONE),
          "h:mm a",
        ),
        pickupAddress: booking.pickupLocation,
        sameLocation: hasSameLocation,
        dropOffAddress: hasSameLocation ? "" : booking.returnLocation,
        actionFeedback: null,
        isModifyDialogOpen: true,
      },
    });
  };

  const submitBookingUpdate = async () => {
    const nextPickupAddress = pickupAddress.trim();
    const nextDropOffAddress = dropOffAddress.trim();
    if (!nextPickupAddress) {
      dispatch({
        type: "patch",
        payload: {
          actionFeedback: {
            type: "error",
            message: "Pickup address is required.",
          },
        },
      });
      return;
    }
    if (!sameLocation && !nextDropOffAddress) {
      dispatch({
        type: "patch",
        payload: {
          actionFeedback: {
            type: "error",
            message: "Drop-off address is required when locations differ.",
          },
        },
      });
      return;
    }
    const payload: UpdateBookingPayload = {
      pickupAddress: nextPickupAddress,
      sameLocation,
    };
    if (booking.type === DAY_BOOKING_TYPE && pickupTime) {
      payload.pickupTime = pickupTime;
    }
    if (!sameLocation) {
      payload.dropOffAddress = nextDropOffAddress;
    }
    try {
      await updateBooking(payload);
      dispatch({
        type: "patch",
        payload: {
          actionFeedback: {
            type: "success",
            message: "Booking updated successfully.",
          },
          isModifyDialogOpen: false,
        },
      });
    } catch (error) {
      dispatch({
        type: "patch",
        payload: {
          actionFeedback: {
            type: "error",
            message: getBookingActionErrorMessage(
              error,
              "Failed to update booking.",
            ),
          },
        },
      });
    }
  };

  const submitBookingCancellation = async () => {
    try {
      await cancelBooking();
      dispatch({
        type: "patch",
        payload: {
          actionFeedback: {
            type: "success",
            message: "Booking cancelled successfully.",
          },
          isCancelDialogOpen: false,
        },
      });
    } catch (error) {
      dispatch({
        type: "patch",
        payload: {
          actionFeedback: {
            type: "error",
            message: getBookingActionErrorMessage(
              error,
              "Failed to cancel booking.",
            ),
          },
        },
      });
    }
  };

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
            {formatDateTime(booking.startDate)}
          </Text>
          <Text selectable className="mt-0.5 text-sm text-neutral-600">
            {formatDateTime(booking.endDate)}
          </Text>

          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <Text selectable className="text-sm font-semibold text-neutral-900">
              {formatCurrency(Number(booking.totalAmount) || 0)}
            </Text>
          </View>
        </View>

        {/* <ChevronRight size={16} color="#6B7280" /> */}
      </Pressable>

      {canBeModified || canBeCancelled ? (
        <View className="mt-3 flex-row items-center gap-2">
          {canBeModified ? (
            <Button
              className="flex-1"
              variant="outline"
              onPress={openModifyDialog}
              disabled={isUpdatingBooking || isCancellingBooking}
            >
              <Text className="text-sm font-medium">Modify Booking</Text>
            </Button>
          ) : null}
          {canBeCancelled ? (
            <Button
              className="flex-1"
              variant="destructive"
              onPress={() => {
                dispatch({
                  type: "patch",
                  payload: {
                    actionFeedback: null,
                    isCancelDialogOpen: true,
                  },
                });
              }}
              disabled={isCancellingBooking || isUpdatingBooking}
            >
              <Text className="text-sm font-semibold text-white">
                {isCancellingBooking ? "Cancelling..." : "Cancel Booking"}
              </Text>
            </Button>
          ) : null}
        </View>
      ) : null}

      {actionFeedback ? (
        <View className="mt-2">
          <Text
            className={
              actionFeedback.type === "success"
                ? "text-xs text-green-700"
                : "text-xs text-red-700"
            }
          >
            {actionFeedback.message}
          </Text>
        </View>
      ) : null}

      <ModifyBookingDialog
        booking={booking}
        open={isModifyDialogOpen}
        onOpenChange={(open) =>
          dispatch({ type: "patch", payload: { isModifyDialogOpen: open } })
        }
        pickupTime={pickupTime}
        setPickupTime={(value) =>
          dispatch({ type: "patch", payload: { pickupTime: value } })
        }
        pickupAddress={pickupAddress}
        setPickupAddress={(value) =>
          dispatch({ type: "patch", payload: { pickupAddress: value } })
        }
        sameLocation={sameLocation}
        setSameLocation={(value) =>
          dispatch({ type: "patch", payload: { sameLocation: value } })
        }
        dropOffAddress={dropOffAddress}
        setDropOffAddress={(value) =>
          dispatch({ type: "patch", payload: { dropOffAddress: value } })
        }
        isSubmitting={isUpdatingBooking}
        onSubmit={() => void submitBookingUpdate()}
      />

      <CancelBookingDialog
        open={isCancelDialogOpen}
        onOpenChange={(open) =>
          dispatch({ type: "patch", payload: { isCancelDialogOpen: open } })
        }
        isSubmitting={isCancellingBooking}
        onSubmit={() => void submitBookingCancellation()}
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
        contentInsetAdjustmentBehavior="automatic"
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
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
