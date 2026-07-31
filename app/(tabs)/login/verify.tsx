import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { otpFormSchema } from "@/lib/validations/auth";
import { useAuthModal } from "@/providers/auth-modal-provider";
import {
  AUTH_DEFAULTS,
  getAuthErrorMessage,
  requestOtp,
  verifyOtp,
  type UserProfile,
} from "@/services/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, View } from "react-native";
import Animated, { SlideInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import type { OtpFormValues } from "@/lib/validations/auth";

export default function VerifyScreen() {
  const router = useRouter();
  const { completeLogin, pendingEmail, isAuthenticated } = useAuthModal();
  const [sessionEmail] = useState<string | null>(pendingEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Keep the OTP email stable for this screen instance so clearing
  // `pendingEmail` during successful login does not cause a transient blank state.
  const email = pendingEmail ?? sessionEmail;

  // If the user lands on /login/verify without an active OTP session
  // (e.g. expo-router restored this route from history after a previous
  // sign-in + logout), bounce them back to the email-entry screen.
  // Skip this when the user has just authenticated — the verify screen will
  // be unmounted by the tab remount, but in the brief overlap window we
  // would otherwise flash `/login` between OTP success and the navigation
  // to home.
  useFocusEffect(
    useCallback(() => {
      if (!pendingEmail && !isAuthenticated) {
        router.replace("/login");
      }
    }, [pendingEmail, isAuthenticated, router]),
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otpCode: "" },
  });

  const onVerify = useCallback(
    async (data: OtpFormValues) => {
      if (!email) {
        setOtpError("Request a new code to continue.");
        return;
      }

      setOtpError(null);
      setIsSubmitting(true);
      try {
        const response = await verifyOtp({
          email,
          otpCode: data.otpCode,
          role: AUTH_DEFAULTS.role,
        });
        const token = response.token;
        if (!token || typeof token !== "string") {
          throw new Error("The server did not return a valid access token.");
        }
        const profile: UserProfile = response.user ?? { email };
        await completeLogin(token, profile);
      } catch (err) {
        setOtpError(getAuthErrorMessage(err, "We could not verify that code."));
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, completeLogin],
  );

  const onCancel = useCallback(() => {
    router.back();
  }, [router]);

  const onResendCode = useCallback(async () => {
    if (!email) return;
    try {
      const response = await requestOtp(email, AUTH_DEFAULTS.role);
      if (!response.success) throw new Error("Unable to resend code.");
      setOtpError(null);
    } catch (err) {
      setOtpError(getAuthErrorMessage(err, "Unable to resend code."));
    }
  }, [email]);

  if (!email) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-white p-6"
        edges={["top", "left", "right", "bottom"]}
      >
        <Text className="text-center text-muted-foreground">
          No email provided. Please start the login process again.
        </Text>
        <Button variant="link" className="mt-4" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        className="flex-1 pb-20"
        contentContainerClassName="flex-grow justify-center"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex w-full items-center p-6">
        <Animated.View
          className="w-full max-w-sm"
          entering={SlideInUp.duration(300)}
        >
          <View className="gap-6 w-full">
            <View className="gap-2">
              <Text className="text-2xl font-bold">Enter your code</Text>
              <Text className="text-muted-foreground">
                Enter the verification code sent to {email}
              </Text>
            </View>

            <Controller
              control={control}
              name="otpCode"
              render={({ field: { onChange, onBlur, value } }) => {
                const otpMessage = errors.otpCode?.message ?? otpError;
                const hasOtpMessage = Boolean(otpMessage);

                return (
                  <View className="gap-1.5">
                    <Text className="text-base font-semibold">
                      Verification code
                    </Text>
                    <Input
                      id="code"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                      returnKeyType="done"
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      editable={!isSubmitting}
                      aria-invalid={!!otpError || !!errors.otpCode}
                      className="h-10 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-500"
                      placeholder="000000"
                    />
                    {hasOtpMessage && (
                      <Text className="text-sm text-destructive">{otpMessage}</Text>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      onPress={onResendCode}
                      disabled={isSubmitting}
                    >
                      <Text className="text-xs">
                        Didn&apos;t receive the code? Resend
                      </Text>
                    </Button>
                  </View>
                );
              }}
            />

            <View className="gap-3">
              <Button
                className="w-full"
                onPress={handleSubmit(onVerify)}
                disabled={isSubmitting}
              >
                <Text>
                  {isSubmitting ? "Verifying..." : "Continue"}
                </Text>
              </Button>
              <Button
                variant="link"
                className="mx-auto"
                onPress={onCancel}
                disabled={isSubmitting}
              >
                <Text>Cancel</Text>
              </Button>
            </View>
          </View>
        </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
