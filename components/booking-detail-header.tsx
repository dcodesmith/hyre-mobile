import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { BookingActionFeedbackBanner } from "@/components/booking-action-feedback-banner";
import type { BookingActionFeedback } from "@/hooks/use-booking-action-controller";
import {
  bookingStatusPillClass,
  bookingTypeDescription,
  paymentStatusPillClass,
} from "@/lib/booking-detail-display";
import { buildBookingSignInRedirectPath } from "@/lib/sign-in-redirect";
import type { BookingDetail } from "@/services/bookings";

export function BookingDetailHeader({
  booking,
  isGuest,
  feedback,
}: Readonly<{
  booking: BookingDetail;
  isGuest: boolean;
  feedback: BookingActionFeedback | null;
}>) {
  const router = useRouter();

  return (
    <>
      <Pressable
        onPress={() =>
          router.replace(isGuest ? "/bookings/lookup" : "/bookings")
        }
        className="mb-3 flex-row items-center gap-1"
        accessibilityRole="link"
        accessibilityLabel={
          isGuest ? "Back to booking lookup" : "Back to Bookings"
        }
      >
        <View className="h-4 w-4 items-center justify-center">
          <ChevronLeft size={16} color="#111827" />
        </View>
        <Text className="text-sm font-medium leading-5 text-neutral-900">
          {isGuest ? "Back to booking lookup" : "Back to Bookings"}
        </Text>
      </Pressable>

      {isGuest ? null : <BookingActionFeedbackBanner feedback={feedback} />}

      <View className="flex-row gap-3">
        <Image
          source={booking.car.images[0]?.url}
          contentFit="cover"
          className="h-12 w-12 rounded-full bg-neutral-100"
        />
        <View className="flex-1">
          <Text selectable className="text-base font-semibold text-neutral-950">
            {booking.car.make} {booking.car.model} ({booking.car.year})
          </Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            <Text selectable className="text-sm text-neutral-600">
              {booking.bookingReference}
            </Text>
            <View
              className={`rounded border px-2 py-0.5 ${bookingStatusPillClass(booking.status)}`}
            >
              <Text className="text-[11px] font-medium capitalize">
                {booking.status.toLowerCase()}
              </Text>
            </View>
            <View
              className={`rounded border px-2 py-0.5 ${paymentStatusPillClass(String(booking.paymentStatus))}`}
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

      {isGuest ? (
        <View className="mt-4 flex-row flex-wrap rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Text selectable className="text-sm text-blue-900">
            Guest access is read-only.{" "}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push(buildBookingSignInRedirectPath(booking.id))
            }
          >
            <Text className="text-sm font-medium text-blue-900 underline">
              Sign in with the booking email
            </Text>
          </Pressable>
          <Text selectable className="text-sm text-blue-900">
            {" "}
            to manage this booking.
          </Text>
        </View>
      ) : null}

      <View className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
        <Text selectable className="text-sm text-blue-800">
          {bookingTypeDescription(booking.type)}
        </Text>
      </View>
    </>
  );
}
