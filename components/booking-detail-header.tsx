import {
  bookingStatusPill,
  paymentStatusPill,
  statusLabel,
} from "@/lib/booking-detail-display";
import { cn } from "@/lib/utils";
import type { BookingDetail } from "@/services/bookings";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

function StatusPill({
  label,
  containerClassName,
  textClassName,
  dotClassName,
}: {
  readonly label: string;
  readonly containerClassName: string;
  readonly textClassName: string;
  readonly dotClassName: string;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-1.5 rounded-full border px-2.5 py-1",
        containerClassName,
      )}
    >
      <View className={cn("h-1.5 w-1.5 rounded-full", dotClassName)} />
      <Text selectable className={cn("text-xs font-medium leading-4", textClassName)}>
        {label}
      </Text>
    </View>
  );
}

export function BookingDetailHeader({
  booking,
  isGuest,
  actions,
}: {
  readonly booking: BookingDetail;
  readonly isGuest: boolean;
  readonly actions?: ReactNode;
}) {
  const router = useRouter();
  const bookingStatus = bookingStatusPill(booking.status);
  const paymentStatus = paymentStatusPill(String(booking.paymentStatus));
  const referenceClass =
    booking.status === "CANCELLED" || booking.status === "REJECTED"
      ? "text-gray-500"
      : "text-emerald-500";
  const backLabel = isGuest ? "Back to booking lookup" : "Back to Bookings";

  return (
    <View className="flex-row items-start gap-2">
      <Pressable
        onPress={() => router.replace(isGuest ? "/bookings/lookup" : "/bookings")}
        accessibilityRole="link"
        accessibilityLabel={backLabel}
        className="rounded-full bg-muted/50 p-2"
      >
        <ArrowLeft size={20} color="#000000" />
      </Pressable>
      <View className="min-w-0 flex-1 gap-3">
        <View className="gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text selectable className={cn("text-sm font-bold leading-none", referenceClass)}>
              {booking.bookingReference}
            </Text>
            <StatusPill
              label={statusLabel(booking.status)}
              containerClassName={bookingStatus.container}
              textClassName={bookingStatus.text}
              dotClassName={bookingStatus.dot}
            />
            <StatusPill
              label={statusLabel(String(booking.paymentStatus))}
              containerClassName={paymentStatus.container}
              textClassName={paymentStatus.text}
              dotClassName={paymentStatus.dot}
            />
          </View>
          <Text
            selectable
            className="text-2xl font-semibold leading-8 tracking-tight text-gray-900"
          >
            {booking.car.make} {booking.car.model} ({booking.car.year})
          </Text>
        </View>
        {actions}
      </View>
    </View>
  );
}
