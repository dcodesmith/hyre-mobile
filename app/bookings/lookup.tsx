import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { AlertCircle, MailCheck } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import {
  guestBookingLookupSchema,
  type GuestBookingLookupValues,
} from "@/lib/validations/guest-booking";
import {
  getGuestBookingRequestErrorMessage,
  requestGuestBookingAccess,
} from "@/services/guest-booking-access";

const STATUS_MESSAGES = {
  "invalid-link":
    "This booking link is invalid or has expired. Request a new access link.",
  unavailable:
    "We couldn’t open that booking link. Request a new link or try again shortly.",
} as const;

export default function GuestBookingLookupScreen() {
  const { status } = useLocalSearchParams<{
    status?: string | string[];
  }>();
  const statusKey = Array.isArray(status) ? status[0] : status;
  const statusMessage =
    statusKey && statusKey in STATUS_MESSAGES
      ? STATUS_MESSAGES[statusKey as keyof typeof STATUS_MESSAGES]
      : null;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuestBookingLookupValues>({
    resolver: zodResolver(guestBookingLookupSchema),
    defaultValues: { bookingReference: "", email: "" },
  });
  const requestAccess = useMutation({
    mutationFn: requestGuestBookingAccess,
    onMutate: () => setSuccessMessage(null),
    onSuccess: (response) => {
      setSuccessMessage(response.message);
      reset();
    },
  });

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-8"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-sm gap-6">
          <View className="gap-1.5">
            <Text selectable className="text-xl font-medium leading-snug">
              Find your booking
            </Text>
            <Text selectable variant="muted">
              Enter the booking reference and email address used for your
              booking. We&apos;ll email you a secure link that works for 15
              minutes.
            </Text>
          </View>

          {statusMessage &&
          !successMessage &&
          !requestAccess.error &&
          Object.keys(errors).length === 0 ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              className="gap-1 rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <View className="flex-row items-center gap-2">
                <AlertCircle size={18} color="#B91C1C" />
                <Text selectable className="text-sm font-medium text-red-800">
                  Unable to open booking
                </Text>
              </View>
              <Text selectable className="text-sm text-red-700">
                {statusMessage}
              </Text>
            </Animated.View>
          ) : null}

          {successMessage ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              className="gap-1 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <View className="flex-row items-center gap-2">
                <MailCheck size={18} color="#111827" />
                <Text selectable className="text-sm font-medium">
                  Check your email
                </Text>
              </View>
              <Text selectable variant="muted">
                {successMessage}
              </Text>
            </Animated.View>
          ) : null}

          <View className="gap-5">
            <Controller
              control={control}
              name="bookingReference"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-1.5">
                  <Text
                    nativeID="booking-reference-label"
                    className="text-sm font-medium"
                  >
                    Booking reference
                  </Text>
                  <Input
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(text) => onChange(text.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="BK-AB12CD34"
                    editable={!requestAccess.isPending}
                    aria-invalid={Boolean(errors.bookingReference)}
                    aria-labelledby="booking-reference-label"
                    className={cn(
                      "h-11",
                      errors.bookingReference && "border-red-500",
                    )}
                  />
                  {errors.bookingReference ? (
                    <Text selectable className="text-sm text-destructive">
                      {errors.bookingReference.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-1.5">
                  <Text
                    nativeID="guest-email-label"
                    className="text-sm font-medium"
                  >
                    Email address
                  </Text>
                  <Input
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    placeholder="you@example.com"
                    editable={!requestAccess.isPending}
                    aria-invalid={Boolean(errors.email)}
                    aria-labelledby="guest-email-label"
                    className={cn("h-11", errors.email && "border-red-500")}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit((values) =>
                      requestAccess.mutate(values),
                    )}
                  />
                  {errors.email ? (
                    <Text selectable className="text-sm text-destructive">
                      {errors.email.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {requestAccess.error ? (
              <Text selectable className="text-sm text-destructive">
                {getGuestBookingRequestErrorMessage(requestAccess.error)}
              </Text>
            ) : null}

            <Button
              className="h-11 w-full"
              disabled={requestAccess.isPending}
              onPress={handleSubmit((values) => requestAccess.mutate(values))}
            >
              {requestAccess.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : null}
              <Text className="text-sm font-medium text-white">
                {requestAccess.isPending
                  ? "Sending access link…"
                  : "Email me an access link"}
              </Text>
            </Button>

            <View className="flex-row items-center justify-center gap-1">
              <Text selectable variant="muted">
                Have an account?
              </Text>
              <Link href="/login" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-sm font-medium underline">
                    Sign in
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
