import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { AuthTextInput } from "@/components/auth/auth-text-input";
import { API_BASE_URL } from "@/constants/config";
import { pickRedirectToParam } from "@/lib/sign-in-redirect";
import { cn } from "@/lib/utils";
import { emailFormSchema } from "@/lib/validations/auth";
import { useAuthModal } from "@/providers/auth-modal-provider";
import { getAuthErrorMessage } from "@/services/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Linking,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated, { SlideInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import type { EmailFormValues } from "@/lib/validations/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { redirectTo: redirectToParam } = useLocalSearchParams<{
    redirectTo?: string | string[];
  }>();
  const redirectTo = pickRedirectToParam(redirectToParam);
  const { requestLoginOtp } = useAuthModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
      referralCode: "",
      acceptTerms: false,
    },
  });

  const onEmailSubmit = useCallback(
    async (data: EmailFormValues) => {
      setApiError(null);
      setIsSubmitting(true);
      try {
        await requestLoginOtp(data.email);
        router.push({
          pathname: "/login/verify",
          params: {
            email: data.email,
            ...(redirectTo ? { redirectTo } : {}),
          },
        });
      } catch (err) {
        setApiError(getAuthErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [redirectTo, requestLoginOtp, router],
  );

  const openTerms = () => Linking.openURL(`${API_BASE_URL}/terms`);
  const openPrivacy = () => Linking.openURL(`${API_BASE_URL}/privacy`);

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
          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <AuthTextInput
                    value={value}
                    onChangeText={(text) => {
                      setApiError(null);
                      onChange(text);
                    }}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="Email address…"
                    editable={!isSubmitting}
                    accessibilityLabel="Email"
                    aria-invalid={Boolean(errors.email)}
                    invalid={Boolean(errors.email)}
                  />
                  {errors.email ? (
                    <Text selectable className="mt-1 text-sm text-red-500">
                      {errors.email.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="referralCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <AuthTextInput
                    value={value ?? ""}
                    onChangeText={(text) => {
                      setApiError(null);
                      onChange(text.toUpperCase());
                    }}
                    onBlur={onBlur}
                    autoCapitalize="characters"
                    autoComplete="off"
                    maxLength={8}
                    spellCheck={false}
                    placeholder="Referral code (optional)…"
                    editable={!isSubmitting}
                    accessibilityLabel="Referral code (optional)"
                    aria-invalid={Boolean(errors.referralCode)}
                    invalid={Boolean(errors.referralCode)}
                  />
                  {errors.referralCode ? (
                    <Text selectable className="mt-1 text-sm text-red-500">
                      {errors.referralCode.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="acceptTerms"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Pressable
                    className={cn(
                      "flex-row items-start gap-2.5",
                      isSubmitting && "opacity-50",
                    )}
                    disabled={isSubmitting}
                    onPress={() => {
                      setApiError(null);
                      onChange(!value);
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: value }}
                    accessibilityLabel="I agree to Tripdly's Terms of Service and Privacy Policy"
                  >
                    <Checkbox
                      pointerEvents="none"
                      checked={value}
                      onCheckedChange={onChange}
                      className={cn(
                        "mt-0.5 rounded-[2px] shadow-none",
                        value
                          ? "border-neutral-900 bg-neutral-900"
                          : "border-neutral-400 bg-white",
                        errors.acceptTerms && "border-red-500",
                      )}
                      checkedClassName="border-neutral-900"
                      indicatorClassName="bg-neutral-900"
                    />
                    <Text className="flex-1 text-sm text-neutral-600">
                      I agree to Tripdly&apos;s{" "}
                      <Text
                        className="text-sm underline"
                        onPress={(event) => {
                          event.stopPropagation();
                          openTerms();
                        }}
                      >
                        Terms
                      </Text>{" "}
                      and{" "}
                      <Text
                        className="text-sm underline"
                        onPress={(event) => {
                          event.stopPropagation();
                          openPrivacy();
                        }}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </Pressable>
                  {errors.acceptTerms ? (
                    <Text selectable className="mt-1 text-sm text-red-500">
                      {errors.acceptTerms.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {apiError ? (
              <Text selectable className="mt-1 text-sm text-red-500">
                {apiError}
              </Text>
            ) : null}

            <Button
              className="h-12 w-full rounded-md bg-neutral-900"
              accessibilityLabel={
                isSubmitting
                  ? "Sending verification code"
                  : "Send verification code"
              }
              onPress={handleSubmit(onEmailSubmit)}
              disabled={isSubmitting}
            >
              <Text className="text-sm font-medium text-white">
                {isSubmitting ? "Sending code…" : "Send verification code"}
              </Text>
            </Button>

            <View className="flex-row flex-wrap items-center justify-center gap-1">
              <Text className="text-sm text-neutral-600">
                Booked as a guest?
              </Text>
              <Link href="/bookings/lookup" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-sm font-medium text-neutral-900 underline">
                    Find your booking
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
