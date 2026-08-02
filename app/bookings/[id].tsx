import { TimePicker } from "@/components/booking-search/TimePicker";
import { AddressAutocompleteInput } from "@/components/ui/address-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useBookingActions } from "@/hooks/use-booking-actions";
import { useBookingDetail } from "@/hooks/use-booking-detail";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  type BookingType,
  DAY_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
} from "@/lib/booking-types";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  type BookingDetail,
  getBookingActionErrorMessage,
} from "@/services/bookings";
import { format, toZonedTime } from "date-fns-tz";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Calendar,
  ChevronLeft,
  CreditCard,
  MapPin,
  Plane,
  User,
} from "lucide-react-native";
import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LAGOS_TIMEZONE = "Africa/Lagos";

const toLagosTime = (value: string | Date) =>
  toZonedTime(new Date(value), LAGOS_TIMEZONE);

const formatDateOnly = (value: string | null | undefined) => {
  if (!value) return "TBD";
  return format(toLagosTime(value), "PPP");
};

const formatTimeOnly = (value: string | null | undefined) => {
  if (!value) return "TBD";
  return format(toLagosTime(value), "h:mm a");
};

const toNumber = (value: number | string | null | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const statusPillClass = (status: string) => {
  if (status === "CANCELLED") return "bg-red-100 text-red-800 border-red-200";
  if (status === "COMPLETED")
    return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-green-100 text-green-800 border-green-200";
};

const paymentPillClass = (paymentStatus: string) => {
  if (paymentStatus === "PAID")
    return "bg-green-100 text-green-800 border-green-200";
  if (paymentStatus === "REFUNDED")
    return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-yellow-100 text-yellow-800 border-yellow-200";
};

const bookingTypeDescription = (type: BookingType) => {
  if (type === "DAY") {
    return "Each booking day is for a 12-hour duration ending 12 hours after the start time unless extended.";
  }
  if (type === "NIGHT") {
    return "Each night booking is for a 6-hour duration starting at 11pm.";
  }
  if (type === "AIRPORT_PICKUP") {
    return "Each airport pickup booking is for a one-way trip from the airport.";
  }
  return "Each full day booking is for a 24-hour duration ending 24 hours after the pickup time.";
};

type BookingActionFeedback = {
  type: "success" | "error";
  message: string;
};

function SectionTitleRow({
  icon,
  title,
}: Readonly<{
  icon: ReactNode;
  title: string;
}>) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-5 w-5 items-center justify-center">{icon}</View>
      <Text className="text-sm font-semibold leading-5 text-neutral-950">
        {title}
      </Text>
    </View>
  );
}

type LegStatus = {
  text: string;
  badgeClassName: string;
};

function getLegStatus(
  bookingStatus: BookingDetail["status"],
  legStart: Date,
  legEnd: Date,
): LegStatus {
  if (bookingStatus === "CANCELLED") {
    return {
      text: "Cancelled",
      badgeClassName: "bg-red-50 text-red-700 border-red-200",
    };
  }
  if (bookingStatus === "COMPLETED") {
    return {
      text: "Completed",
      badgeClassName: "bg-green-50 text-green-700 border-green-200",
    };
  }
  const now = new Date();
  const isStarted = now >= legStart && now < legEnd;
  const isCompleted = now >= legEnd;
  if (isStarted) {
    return {
      text: "Active",
      badgeClassName: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  if (isCompleted) {
    return {
      text: "Completed",
      badgeClassName: "bg-green-50 text-green-700 border-green-200",
    };
  }
  return {
    text: "Upcoming",
    badgeClassName: "bg-slate-50 text-slate-700 border-slate-200",
  };
}

function getServiceTypeText(type: BookingType): string {
  if (type === FULL_DAY_BOOKING_TYPE) return "Standard 24-hour service";
  if (type === NIGHT_BOOKING_TYPE) return "Standard 6-hour service";
  if (type === AIRPORT_PICKUP_BOOKING_TYPE) return "Airport pickup service";
  return "Standard 12-hour service";
}

function formatTimelinePickupTime(type: BookingType, value: string): string {
  const date = toLagosTime(value);
  if (type === FULL_DAY_BOOKING_TYPE) {
    return format(date, "h:mm a - MMM do");
  }
  return format(date, "h:mm a");
}

function formatTimelineDropoffTime(
  type: BookingType,
  value: string,
  extendedHours: number,
): string {
  const date = toLagosTime(value);
  const base =
    type === FULL_DAY_BOOKING_TYPE
      ? format(date, "h:mm a - MMM do")
      : format(date, "h:mm a");

  return extendedHours > 0 ? `${base} (Extended)` : base;
}

function BookingLegTimelineRow({
  label,
  value,
  isStarted,
}: Readonly<{
  label: "Pickup" | "Drop-off";
  value: string;
  isStarted: boolean;
}>) {
  let labelColorClassName = "text-slate-400";
  if (isStarted) {
    labelColorClassName =
      label === "Pickup" ? "text-green-600" : "text-red-600";
  }

  return (
    <View>
      <View className="mb-1 flex-row items-center gap-2">
        <Text className={`min-w-16 text-sm font-medium ${labelColorClassName}`}>
          {label}
        </Text>
        <View
          className={`rounded border px-2 py-0.5 ${
            isStarted ? "border-neutral-200" : "border-slate-200"
          }`}
        >
          <Text
            className={`text-sm font-semibold ${isStarted ? "text-slate-900" : "text-slate-400"}`}
          >
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ExtendedDayAlert({
  isStarted,
  extendedHours,
}: Readonly<{ isStarted: boolean; extendedHours: number }>) {
  const containerClassName = cn(
    "rounded border px-3 py-2",
    isStarted
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-slate-100",
  );
  const textClassName = cn(
    "text-sm",
    isStarted ? "text-amber-800" : "text-slate-600 line-through",
  );
  const verb = isStarted ? "has been" : "was";
  const hoursLabel = extendedHours === 1 ? "hour" : "hours";

  return (
    <View className={containerClassName}>
      <Text className={textClassName}>
        Your drop-off time {verb} extended by {extendedHours} {hoursLabel}.
      </Text>
    </View>
  );
}

function BookingTimelineLegItem({
  leg,
  index,
  totalLegs,
  bookingType,
  bookingStatus,
}: Readonly<{
  leg: BookingDetail["legs"][number];
  index: number;
  totalLegs: number;
  bookingType: BookingType;
  bookingStatus: BookingDetail["status"];
}>) {
  const legStart = new Date(leg.legStartTime);
  const legEnd = new Date(leg.legEndTime);
  const now = new Date();
  const isBookingCancelled = bookingStatus === "CANCELLED";
  const isBookingCompleted = bookingStatus === "COMPLETED";
  const isStarted =
    !isBookingCancelled &&
    !isBookingCompleted &&
    now >= legStart &&
    now < legEnd;
  const status = getLegStatus(bookingStatus, legStart, legEnd);
  const extendedHours = (leg.extensions ?? []).reduce(
    (acc, ext) => acc + (ext.extendedDurationHours ?? 0),
    0,
  );
  const isExtendedDayBooking =
    extendedHours > 0 && bookingType === DAY_BOOKING_TYPE;

  const markerClassName = isStarted ? "bg-green-500" : "bg-slate-300";
  const markerLineClassName = isStarted ? "bg-slate-200" : "bg-slate-100";
  const dropoffMarkerClassName = isStarted ? "bg-red-500" : "bg-slate-300";
  const dayTitleClassName = isStarted ? "text-slate-700" : "text-slate-400";
  const serviceTextClassName = isStarted ? "text-slate-600" : "text-slate-400";

  const footerNode: ReactNode = isExtendedDayBooking ? (
    <ExtendedDayAlert isStarted={isStarted} extendedHours={extendedHours} />
  ) : (
    <Text className={`text-sm ${serviceTextClassName}`}>
      {getServiceTypeText(bookingType)}
    </Text>
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Text className={`text-sm font-semibold ${dayTitleClassName}`}>
          Day {index + 1} -{" "}
          {format(toLagosTime(leg.legDate), "EEE, MMM do, yyyy")}
        </Text>
        <View className={`rounded border px-2 py-0.5 ${status.badgeClassName}`}>
          <Text className="text-xs font-medium">{status.text}</Text>
        </View>
      </View>

      <View className="flex-row items-start gap-4">
        <View className="mt-1 items-center">
          <View className={`h-3 w-3 rounded-full ${markerClassName}`} />
          <View className={`h-8 w-px ${markerLineClassName}`} />
          <View className={`h-3 w-3 rounded-full ${dropoffMarkerClassName}`} />
        </View>

        <View className="flex-1 gap-3">
          <BookingLegTimelineRow
            label="Pickup"
            value={formatTimelinePickupTime(bookingType, leg.legStartTime)}
            isStarted={isStarted}
          />
          <BookingLegTimelineRow
            label="Drop-off"
            value={formatTimelineDropoffTime(
              bookingType,
              leg.legEndTime,
              extendedHours,
            )}
            isStarted={isStarted}
          />
        </View>
      </View>

      {footerNode}

      {index < totalLegs - 1 ? <View className="h-px bg-neutral-200" /> : null}
    </View>
  );
}

function PaymentSummaryCard({ booking }: Readonly<{ booking: BookingDetail }>) {
  const netTotal = toNumber(booking.netTotal);
  const securityDetailCost = toNumber(booking.securityDetailCost);
  const fuelUpgradeCost = toNumber(booking.fuelUpgradeCost);
  const referralDiscountAmount = toNumber(booking.referralDiscountAmount);
  const referralCreditsUsed = toNumber(booking.referralCreditsUsed);
  const referralCreditsReserved = toNumber(booking.referralCreditsReserved);
  const platformFee = toNumber(booking.platformCustomerServiceFeeAmount);
  const platformFeeRate = toNumber(
    booking.platformCustomerServiceFeeRatePercent,
  );
  const vatAmount = toNumber(booking.vatAmount);
  const vatRate = toNumber(booking.vatRatePercent);
  const totalAmount = toNumber(booking.totalAmount);

  return (
    <Card className="rounded-xl py-4">
      <CardHeader className="px-4">
        <SectionTitleRow
          icon={<CreditCard size={18} color="#2563EB" />}
          title="Payment Summary"
        />
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-slate-600">
              Net Total ({booking.legs.length}{" "}
              {booking.legs.length === 1 ? "day" : "days"})
            </Text>
            <Text className="text-sm font-medium text-slate-950">
              {formatCurrency(netTotal)}
            </Text>
          </View>

          {securityDetailCost > 0 ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-slate-600">Security Detail</Text>
              <Text className="text-sm font-medium text-slate-950">
                {formatCurrency(securityDetailCost)}
              </Text>
            </View>
          ) : null}

          {fuelUpgradeCost > 0 ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-slate-600">Fuel Upgrade</Text>
              <Text className="text-sm font-medium text-slate-950">
                {formatCurrency(fuelUpgradeCost)}
              </Text>
            </View>
          ) : null}

          {referralDiscountAmount > 0 ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-green-600">Referral Discount</Text>
              <Text className="text-sm font-medium text-green-600">
                -{formatCurrency(referralDiscountAmount)}
              </Text>
            </View>
          ) : null}

          {referralCreditsUsed > 0 ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-green-600">
                Referral Credits Used
              </Text>
              <Text className="text-sm font-medium text-green-600">
                -{formatCurrency(referralCreditsUsed)}
              </Text>
            </View>
          ) : null}

          {referralCreditsReserved > 0 && booking.paymentStatus !== "PAID" ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-orange-600">
                Referral Credits (Pending Payment)
              </Text>
              <Text className="text-sm font-medium text-orange-600">
                -{formatCurrency(referralCreditsReserved)}
              </Text>
            </View>
          ) : null}

          {platformFee > 0 ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-slate-600">
                Platform Fee ({platformFeeRate}%)
              </Text>
              <Text className="text-sm font-medium text-slate-950">
                {formatCurrency(platformFee)}
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-slate-600">VAT ({vatRate}%)</Text>
            <Text className="text-sm font-medium text-slate-950">
              {formatCurrency(vatAmount)}
            </Text>
          </View>

          <View className="my-1 h-px bg-neutral-200" />
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-neutral-950">
              Total Amount
            </Text>
            <Text className="text-base font-bold text-neutral-950">
              {formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
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
  booking: BookingDetail;
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
              ? "Edit pickup time and location details for this booking."
              : "Edit pickup and drop-off location details for this booking."}
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
            <Text className="text-sm font-medium">Close</Text>
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
  showRefundWarning,
  onSubmit,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  showRefundWarning: boolean;
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

        {showRefundWarning ? (
          <View className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <Text className="text-sm text-amber-800">
              A refund will be processed automatically.
            </Text>
          </View>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <Text className="text-sm font-medium">Keep Booking</Text>
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

function BookingActionFeedbackBanner({
  feedback,
}: Readonly<{ feedback: BookingActionFeedback | null }>) {
  if (!feedback) return null;
  const isSuccess = feedback.type === "success";
  return (
    <View
      className={cn(
        "mb-3 rounded-lg border px-3 py-2.5",
        isSuccess ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50",
      )}
    >
      <Text
        className={
          isSuccess ? "text-sm text-green-800" : "text-sm text-red-800"
        }
      >
        {feedback.message}
      </Text>
    </View>
  );
}

export default function BookingDetailScreen() {
  const router = useRouter();
  const { isAuthenticated, openLoginModal } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const bookingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const bookingQuery = useBookingDetail(bookingId, isAuthenticated);
  const {
    updateBooking: updateBookingAction,
    cancelBooking: cancelBookingAction,
    isUpdatingBooking,
    isCancellingBooking,
  } = useBookingActions(bookingId);
  const [actionFeedback, setActionFeedback] =
    useState<BookingActionFeedback | null>(null);
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [pickupTime, setPickupTime] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [sameLocation, setSameLocation] = useState(true);
  const [dropOffAddress, setDropOffAddress] = useState("");

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-neutral-950">
            Sign in to continue
          </Text>
          <Text className="mt-2 text-center text-sm text-neutral-500">
            Booking details are only available for authenticated users.
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

  if (bookingQuery.isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
          <Text className="mt-2 text-sm text-neutral-500">
            Loading booking details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (bookingQuery.error || !bookingQuery.data) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-red-700">
            Booking not found
          </Text>
          <Text className="mt-2 text-center text-sm text-red-600">
            We couldn&apos;t fetch this booking. Please try again.
          </Text>
          <Button
            className="mt-5 w-full max-w-[220px]"
            onPress={() => bookingQuery.refetch()}
          >
            <Text className="text-sm font-semibold text-white">Retry</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const booking = bookingQuery.data;

  const openModifyDialog = () => {
    setPickupTime(format(toLagosTime(booking.startDate), "h:mm a"));
    setPickupAddress(booking.pickupLocation);
    const isSameLocation = booking.pickupLocation === booking.returnLocation;
    setSameLocation(isSameLocation);
    setDropOffAddress(isSameLocation ? "" : booking.returnLocation);
    setActionFeedback(null);
    setIsModifyDialogOpen(true);
  };

  const submitBookingUpdate = async () => {
    const nextPickupAddress = pickupAddress.trim();
    const nextDropOffAddress = dropOffAddress.trim();
    if (!nextPickupAddress) {
      setActionFeedback({
        type: "error",
        message: "Pickup address is required.",
      });
      return;
    }
    if (!sameLocation && !nextDropOffAddress) {
      setActionFeedback({
        type: "error",
        message: "Drop-off address is required when locations differ.",
      });
      return;
    }

    try {
      await updateBookingAction({
        ...(booking.type === DAY_BOOKING_TYPE && pickupTime
          ? { pickupTime }
          : {}),
        pickupAddress: nextPickupAddress,
        sameLocation,
        ...(sameLocation ? {} : { dropOffAddress: nextDropOffAddress }),
      });
      setActionFeedback({
        type: "success",
        message: "Booking updated successfully.",
      });
      setIsModifyDialogOpen(false);
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: getBookingActionErrorMessage(
          error,
          "Failed to update booking.",
        ),
      });
    }
  };

  const submitBookingCancellation = async () => {
    try {
      await cancelBookingAction();
      setActionFeedback({
        type: "success",
        message: "Booking cancelled successfully.",
      });
      setIsCancelDialogOpen(false);
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: getBookingActionErrorMessage(
          error,
          "Failed to cancel booking.",
        ),
      });
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="px-4 py-4">
          <Pressable
            onPress={() => router.replace("/bookings")}
            className="mb-3 flex-row items-center gap-1"
          >
            <View className="h-4 w-4 items-center justify-center">
              <ChevronLeft size={16} color="#111827" />
            </View>
            <Text className="text-sm font-medium leading-5 text-neutral-900">
              Back to Bookings
            </Text>
          </Pressable>

          <BookingActionFeedbackBanner feedback={actionFeedback} />

          <View className="flex-row gap-3">
            <Image
              source={booking.car.images[0]?.url}
              contentFit="cover"
              className="h-12 w-12 rounded-full bg-neutral-100"
            />
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-950">
                {booking.car.make} {booking.car.model} ({booking.car.year})
              </Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-2">
                <Text className="text-sm text-neutral-600">
                  {booking.bookingReference}
                </Text>
                <View
                  className={`rounded border px-2 py-0.5 ${statusPillClass(booking.status)}`}
                >
                  <Text className="text-[11px] font-medium capitalize">
                    {booking.status.toLowerCase()}
                  </Text>
                </View>
                <View
                  className={`rounded border px-2 py-0.5 ${paymentPillClass(String(booking.paymentStatus))}`}
                >
                  <Text className="text-[11px] font-medium capitalize">
                    {String(booking.paymentStatus)
                      .toLowerCase()
                      .replaceAll("_", " ")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Text className="text-sm text-blue-800">
              {bookingTypeDescription(booking.type)}
            </Text>
          </View>

          <View className="mt-4 gap-4">
            <Card className="rounded-xl py-4">
              <CardHeader className="px-4">
                <SectionTitleRow
                  icon={<Calendar size={18} color="#2563EB" />}
                  title="Trip Timeline"
                />
              </CardHeader>
              <CardContent className="px-4 pt-0">
                <View className="gap-6">
                  {booking.legs.map((leg, index) => (
                    <BookingTimelineLegItem
                      key={leg.id}
                      leg={leg}
                      index={index}
                      totalLegs={booking.legs.length}
                      bookingType={booking.type}
                      bookingStatus={booking.status}
                    />
                  ))}
                </View>
              </CardContent>
            </Card>

            <Card className="rounded-xl py-4">
              <CardHeader className="px-4">
                <SectionTitleRow
                  icon={<MapPin size={18} color="#2563EB" />}
                  title="Location Details"
                />
              </CardHeader>
              <CardContent className="px-4 pt-0">
                <View className="gap-3">
                  <View className="flex-row items-start gap-3">
                    <View className="mt-2 h-2 w-2 rounded-full bg-green-500" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-slate-600">
                        Pickup Location
                      </Text>
                      <Text className="text-sm font-semibold text-slate-900">
                        {booking.pickupLocation}
                      </Text>
                    </View>
                  </View>
                  <View className="h-px bg-neutral-200" />
                  <View className="flex-row items-start gap-3">
                    <View className="mt-2 h-2 w-2 rounded-full bg-red-500" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-slate-600">
                        Return Location
                      </Text>
                      <Text className="text-sm font-semibold text-slate-900">
                        {booking.returnLocation}
                      </Text>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>

            <Card className="rounded-xl py-4">
              <CardHeader className="px-4">
                <SectionTitleRow
                  icon={<User size={18} color="#2563EB" />}
                  title="Your Chauffeur"
                />
              </CardHeader>
              <CardContent className="px-4 pt-0">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Text className="text-sm font-semibold text-slate-700">
                      {booking.chauffeur?.name?.charAt(0).toUpperCase() ?? "N"}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-slate-900">
                      {booking.chauffeur?.name ?? "Not Assigned"}
                    </Text>
                    <Text className="text-sm text-slate-600">
                      Professional Chauffeur
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {booking.flight ? (
              <Card className="rounded-xl py-4">
                <CardHeader className="px-4">
                  <SectionTitleRow
                    icon={<Plane size={18} color="#2563EB" />}
                    title="Flight Information"
                  />
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-lg font-bold text-slate-900">
                          {booking.flight.flightNumber ?? "Flight"}
                        </Text>
                        <Text className="text-sm text-slate-600">
                          {formatDateOnly(booking.flight.scheduledArrival)}
                        </Text>
                      </View>
                      <View className="rounded border border-blue-200 bg-blue-100 px-2 py-1">
                        <Text className="text-xs font-medium capitalize text-blue-800">
                          {booking.flight.status
                            ?.toLowerCase()
                            .replaceAll("_", " ") ?? "scheduled"}
                        </Text>
                      </View>
                    </View>
                    <View className="h-px bg-neutral-200" />
                    <View className="gap-1">
                      <Text className="text-xs font-medium uppercase text-slate-500">
                        From
                      </Text>
                      <Text className="text-sm font-semibold text-slate-900">
                        {booking.flight.originName ??
                          booking.flight.originCode ??
                          "N/A"}
                      </Text>
                    </View>
                    <View className="gap-1">
                      <Text className="text-xs font-medium uppercase text-slate-500">
                        To
                      </Text>
                      <Text className="text-sm font-semibold text-slate-900">
                        {booking.flight.destinationName ??
                          booking.flight.destinationCode ??
                          "N/A"}
                      </Text>
                    </View>
                    <View className="h-px bg-neutral-200" />
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs font-medium uppercase text-slate-500">
                          Scheduled Arrival
                        </Text>
                        <Text className="text-sm font-semibold text-slate-900">
                          {formatTimeOnly(booking.flight.scheduledArrival)}
                        </Text>
                      </View>
                      {booking.flight.estimatedArrival ? (
                        <View>
                          <Text className="text-xs font-medium uppercase text-slate-500">
                            Estimated Arrival
                          </Text>
                          <Text className="text-sm font-semibold text-slate-900">
                            {formatTimeOnly(booking.flight.estimatedArrival)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </CardContent>
              </Card>
            ) : null}

            <PaymentSummaryCard booking={booking} />

            {booking.canEdit || booking.canCancel ? (
              <Card className="rounded-xl py-4">
                <CardHeader className="px-4">
                  <SectionTitleRow
                    icon={<CreditCard size={18} color="#2563EB" />}
                    title="Booking Actions"
                  />
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <View className="gap-2">
                    {booking.canEdit ? (
                      <Button
                        variant="outline"
                        onPress={openModifyDialog}
                        disabled={isUpdatingBooking || isCancellingBooking}
                      >
                        <Text className="text-sm font-medium">
                          Modify Booking
                        </Text>
                      </Button>
                    ) : null}
                    {booking.canCancel ? (
                      <Button
                        variant="outline"
                        onPress={() => {
                          setActionFeedback(null);
                          setIsCancelDialogOpen(true);
                        }}
                        disabled={isUpdatingBooking || isCancellingBooking}
                      >
                        <Text className="text-sm font-medium text-red-600">
                          {isCancellingBooking
                            ? "Cancelling..."
                            : "Cancel Booking"}
                        </Text>
                      </Button>
                    ) : null}
                  </View>
                </CardContent>
              </Card>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <ModifyBookingDialog
        booking={booking}
        open={isModifyDialogOpen}
        onOpenChange={setIsModifyDialogOpen}
        pickupTime={pickupTime}
        setPickupTime={setPickupTime}
        pickupAddress={pickupAddress}
        setPickupAddress={setPickupAddress}
        sameLocation={sameLocation}
        setSameLocation={setSameLocation}
        dropOffAddress={dropOffAddress}
        setDropOffAddress={setDropOffAddress}
        isSubmitting={isUpdatingBooking}
        onSubmit={() => void submitBookingUpdate()}
      />

      <CancelBookingDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        isSubmitting={isCancellingBooking}
        showRefundWarning={booking.paymentStatus === "PAID"}
        onSubmit={() => void submitBookingCancellation()}
      />
    </SafeAreaView>
  );
}
