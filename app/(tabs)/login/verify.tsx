import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthTextInput } from "@/components/auth/auth-text-input";
import { ApiError } from "@/lib/api-client";
import { pickRedirectToParam } from "@/lib/sign-in-redirect";
import { otpFormSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";
import { useAuthModal } from "@/providers/auth-modal-provider";
import { getAuthErrorMessage } from "@/services/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { SlideInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import type { OtpFormValues } from "@/lib/validations/auth";

export default function VerifyScreen() {
  const router = useRouter();
  const { redirectTo: redirectToParam } = useLocalSearchParams<{
    redirectTo?: string | string[];
  }>();
  const redirectTo = pickRedirectToParam(redirectToParam);
  const {
    isAuthenticated,
    pendingEmail,
    requestLoginOtp,
    verifyLoginOtp,
  } = useAuthModal();
  const [sessionEmail] = useState<string | null>(pendingEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Keep the OTP email stable for this screen instance so clearing
  // `pendingEmail` during successful login does not cause a transient blank state.
  const email = pendingEmail ?? sessionEmail;

  // If the user lands on /login/verify without an active OTP session
  // (e.g. expo-router restored this route from history after a previous
  // sign-in + logout), bounce them back to the email-entry screen.
  // Skip this when the user has just authenticated — the verify screen will
  // be unmounted by the tab remount, but in the brief overlap window we
  // would otherwise flash `/login` between OTP success and continuation.
  useFocusEffect(
    useCallback(() => {
      if (!pendingEmail && !isAuthenticated) {
        router.replace({
          pathname: "/login",
          params: redirectTo ? { redirectTo } : {},
        });
      }
    }, [pendingEmail, isAuthenticated, redirectTo, router]),
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otpCode: "" },
  });

  const startAgain = useCallback(() => {
    router.replace({
      pathname: "/login",
      params: redirectTo ? { redirectTo } : {},
    });
  }, [redirectTo, router]);

  const onVerify = useCallback(
    async (data: OtpFormValues) => {
      if (!email) {
        setOtpError("Request a new code to continue.");
        return;
      }

      setOtpError(null);
      setFormError(null);
      setNotice(null);
      setIsSubmitting(true);
      try {
        await verifyLoginOtp(data.otpCode, redirectTo);
      } catch (err) {
        const message = getAuthErrorMessage(err);
        if (err instanceof ApiError && err.status === 400) {
          setOtpError(message);
        } else {
          setFormError(message);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, redirectTo, verifyLoginOtp],
  );

  const onResendCode = useCallback(async () => {
    if (!email) return;
    setOtpError(null);
    setFormError(null);
    setNotice(null);
    setIsResending(true);
    try {
      await requestLoginOtp(email);
      setNotice("A new code is on its way.");
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  }, [email, requestLoginOtp]);

  if (!email) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-neutral-600">
            No email provided. Please start the login process again.
          </Text>
          <Pressable className="mt-4" onPress={startAgain}>
            <Text className="text-sm font-medium text-neutral-900 underline">
              Start again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const codeMessage = errors.otpCode?.message ?? otpError;
  const isBusy = isSubmitting || isResending;

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
        <Animated.View
          className="mx-auto w-full max-w-sm"
          entering={SlideInUp.duration(300)}
        >
          <Text selectable className="mb-4 text-sm text-neutral-600">
            Code sent to {email}
          </Text>

          <View className="gap-4">
            <Controller
              control={control}
              name="otpCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <AuthTextInput
                    value={value}
                    onChangeText={(text) => {
                      setOtpError(null);
                      setFormError(null);
                      setNotice(null);
                      onChange(text);
                    }}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={6}
                    spellCheck={false}
                    returnKeyType="done"
                    placeholder="6-digit code…"
                    editable={!isBusy}
                    accessibilityLabel="Verification code"
                    aria-invalid={Boolean(codeMessage)}
                    invalid={Boolean(codeMessage)}
                    style={{ letterSpacing: 1.6 }}
                    onSubmitEditing={handleSubmit(onVerify)}
                  />
                  {codeMessage ? (
                    <Text selectable className="mt-1 text-sm text-red-500">
                      {codeMessage}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {formError ? (
              <Text selectable className="mt-1 text-sm text-red-500">
                {formError}
              </Text>
            ) : null}

            {notice ? (
              <Text selectable className="text-sm text-neutral-600">
                {notice}
              </Text>
            ) : null}

            <Button
              className="h-12 w-full rounded-md bg-neutral-900"
              accessibilityLabel={
                isSubmitting ? "Verifying code" : "Verify email"
              }
              onPress={handleSubmit(onVerify)}
              disabled={isBusy}
            >
              <Text className="text-sm font-medium text-white">
                {isSubmitting ? "Verifying…" : "Verify email"}
              </Text>
            </Button>
          </View>

          <View className="mt-4 flex-row items-center gap-1">
            <Text className="text-sm text-neutral-600">Didn&apos;t get it?</Text>
            <Pressable
              onPress={onResendCode}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Resend code"
            >
              <Text
                className={cn(
                  "text-sm font-medium text-neutral-900 underline",
                  isBusy && "opacity-50",
                )}
              >
                {isResending ? "Sending…" : "Resend code"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 flex-row flex-wrap items-center gap-1">
            <Text className="text-sm text-neutral-600">Wrong email?</Text>
            <Pressable
              onPress={startAgain}
              disabled={isBusy}
              accessibilityRole="link"
            >
              <Text
                className={cn(
                  "text-sm font-medium text-neutral-900 underline",
                  isBusy && "opacity-50",
                )}
              >
                Start again
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
