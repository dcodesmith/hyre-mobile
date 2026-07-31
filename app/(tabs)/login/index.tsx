import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { API_BASE_URL } from "@/constants/config";
import { emailFormSchema } from "@/lib/validations/auth";
import { useAuthModal } from "@/providers/auth-modal-provider";
import { AUTH_DEFAULTS, getAuthErrorMessage, requestOtp } from "@/services/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Linking, Pressable, ScrollView, View } from "react-native";
import Animated, { SlideInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import type { EmailFormValues } from "@/lib/validations/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { setPendingEmail } = useAuthModal();
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
        const response = await requestOtp(data.email, AUTH_DEFAULTS.role);
        if (!response.success) {
          throw new Error("Unable to send a verification code right now.");
        }
        // Record the active OTP session so /login/verify knows this isn't a
        // stale stack restoration after logout.
        setPendingEmail(data.email);
        router.push({
          pathname: "/login/verify",
          params: { email: data.email },
        });
      } catch (err) {
        setApiError(
          getAuthErrorMessage(err, "Unable to send a verification code right now."),
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, setPendingEmail],
  );

  const openTerms = () => Linking.openURL(`${API_BASE_URL}/terms`);
  const openPrivacy = () => Linking.openURL(`${API_BASE_URL}/privacy`);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        className="flex-1 pb-20 text-sm"
        contentContainerClassName="flex-grow justify-center"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex w-full items-center p-6">
        <Animated.View
          className="w-full max-w-sm"
          entering={SlideInUp.duration(300)}
        >
          <View className="flex flex-col gap-6">
            <View className="rounded-lg border border-neutral-200 bg-white">
              <View className="flex flex-col space-y-1.5 p-6">
                <Text className="text-base font-semibold text-neutral-950">
                  Login or sign up to your account
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Enter your email below to login or sign up to your account
                </Text>
              </View>

              <View className="p-6 pt-0">
                <View className="flex flex-col gap-4">
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="space-y-1">
                        <Text
                          nativeID="email-label"
                          className="text-sm font-medium"
                        >
                          Email
                        </Text>
                        <Input
                          id="email"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholder="m@example.com"
                          autoComplete="email"
                          editable={!isSubmitting}
                          aria-invalid={!!errors.email}
                          accessibilityLabel="Email"
                          aria-labelledby="email-label"
                          className="h-10 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-500"
                        />
                        {errors.email && (
                          <Text className="text-sm text-destructive">
                            {errors.email.message}
                          </Text>
                        )}
                      </View>
                    )}
                  />

                  <Controller
                    control={control}
                    name="referralCode"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="space-y-1">
                        <Text
                          nativeID="referral-label"
                          className="text-sm font-medium"
                        >
                          Referral code (optional)
                        </Text>
                        <Input
                          id="referralCode"
                          value={value ?? ""}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="XXXXXXXX"
                          editable={!isSubmitting}
                          accessibilityLabel="Referral code (optional)"
                          aria-labelledby="referral-label"
                          className="h-10 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-500"
                        />
                      </View>
                    )}
                  />

                  <Controller
                    control={control}
                    name="acceptTerms"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Pressable
                          className="flex flex-row items-center gap-2"
                          onPress={() => onChange(!value)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: value }}
                          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
                        >
                          <Checkbox
                            checked={value}
                            onCheckedChange={onChange}
                          />
                          <Text className="flex-1 text-sm text-muted-foreground">
                            I agree to the{" "}
                            <Text
                              className="text-primary"
                              onPress={(e) => {
                                e.stopPropagation();
                                openTerms();
                              }}
                            >
                              Terms of Service
                            </Text>{" "}
                            and{" "}
                            <Text
                              className="text-primary"
                              onPress={(e) => {
                                e.stopPropagation();
                                openPrivacy();
                              }}
                            >
                              Privacy Policy
                            </Text>
                          </Text>
                        </Pressable>
                        {errors.acceptTerms && (
                          <Text className="text-sm text-destructive">
                            {errors.acceptTerms.message}
                          </Text>
                        )}
                      </>
                    )}
                  />

                  {!!apiError && (
                    <Text className="text-sm text-destructive">{apiError}</Text>
                  )}

                  <Button
                    variant="default"
                    className="h-10 w-full rounded-md px-4 py-2"
                    onPress={handleSubmit(onEmailSubmit)}
                    disabled={isSubmitting}
                  >
                    <Text className="text-sm font-medium text-neutral-50">
                      {isSubmitting ? "Sending..." : "Continue with Email"}
                    </Text>
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
