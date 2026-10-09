import { AuthTextInput } from "@/components/auth/auth-text-input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { VerifyOtpForm } from "@/components/ui/verify-otp-form";
import { useAuth } from "@/hooks/use-auth";
import {
  normalizePhoneOtpInput,
  readPhoneVerificationContinuation,
  shouldAutoFinishPhoneVerification,
} from "@/lib/phone-verification-continuation";
import {
  PHONE_OTP_MAX_LENGTH,
  PHONE_OTP_MIN_LENGTH,
  phoneNumberSchema,
  phoneOtpCodeSchema,
} from "@/lib/validations/auth";
import {
  checkPhoneVerification,
  getAuthErrorMessage,
  requestPhoneVerification,
} from "@/services/auth";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PhoneVerificationScreen() {
  const params = useLocalSearchParams<{
    redirectTo?: string | string[];
    resumePrevious?: string | string[];
    reason?: string | string[];
  }>();
  const { redirectTo, resumePrevious } =
    readPhoneVerificationContinuation(params);
  const {
    completePhoneVerification,
    isAuthenticated,
    isHydrating,
    isLoggingOut,
    logout,
    openLoginModal,
    user,
  } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [maskedPhoneNumber, setMaskedPhoneNumber] = useState<string | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFinishingRef = useRef(false);

  const finishVerification = useCallback(async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    try {
      await completePhoneVerification(redirectTo, resumePrevious);
    } catch (verificationError) {
      isFinishingRef.current = false;
      throw verificationError;
    }
  }, [completePhoneVerification, redirectTo, resumePrevious]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );
      return () => subscription.remove();
    }, []),
  );

  useEffect(() => {
    if (isHydrating || isLoggingOut) return;
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (
      shouldAutoFinishPhoneVerification({
        phoneVerified: user?.phoneVerified,
        reason: params.reason,
      })
    ) {
      void finishVerification().catch((verificationError) => {
        setError(getAuthErrorMessage(verificationError));
      });
    }
  }, [
    finishVerification,
    isAuthenticated,
    isHydrating,
    isLoggingOut,
    openLoginModal,
    params.reason,
    user?.phoneVerified,
  ]);

  useEffect(() => {
    if (!phoneNumber && user?.phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [phoneNumber, user?.phoneNumber]);

  const sendPhoneCode = useCallback(
    async (number: string, isResend: boolean) => {
      setError(null);
      setNotice(null);
      setIsSubmitting(true);
      try {
        const response = await requestPhoneVerification(number);
        setPhoneNumber(number);
        setMaskedPhoneNumber(response.phoneNumber);
        if (response.status === "VERIFIED") {
          await finishVerification();
        } else if (isResend) {
          setNotice("A new code is on its way.");
        }
      } catch (requestError) {
        setError(getAuthErrorMessage(requestError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [finishVerification],
  );

  const sendCode = useCallback(async () => {
    const parsed = phoneNumberSchema.safeParse(phoneNumber);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number.");
      return;
    }

    await sendPhoneCode(parsed.data, false);
  }, [phoneNumber, sendPhoneCode]);

  const verifyCode = useCallback(async () => {
    const parsed = phoneOtpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid code.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const response = await checkPhoneVerification(phoneNumber, parsed.data);
      setMaskedPhoneNumber(response.phoneNumber);
      if (response.status !== "VERIFIED") {
        throw new Error("Your phone number has not been verified yet.");
      }
      await finishVerification();
    } catch (verificationError) {
      setError(getAuthErrorMessage(verificationError));
    } finally {
      setIsSubmitting(false);
    }
  }, [code, finishVerification, phoneNumber]);

  const resendCode = useCallback(
    () => sendPhoneCode(phoneNumber, true),
    [phoneNumber, sendPhoneCode],
  );

  const editPhoneNumber = useCallback(() => {
    setMaskedPhoneNumber(null);
    setCode("");
    setError(null);
    setNotice(null);
  }, []);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-8"
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-sm">
          {maskedPhoneNumber ? (
            <View className="gap-3">
              <VerifyOtpForm
                title="Verify your phone"
                description={`Enter the verification code sent to ${maskedPhoneNumber}.`}
                otpCode={code}
                onOtpCodeChange={(value) => {
                  setCode(normalizePhoneOtpInput(value, PHONE_OTP_MAX_LENGTH));
                  setError(null);
                  setNotice(null);
                }}
                onSubmit={verifyCode}
                onCancel={editPhoneNumber}
                onResendCode={resendCode}
                isSubmitting={isSubmitting}
                error={error}
                minCodeLength={PHONE_OTP_MIN_LENGTH}
                maxCodeLength={PHONE_OTP_MAX_LENGTH}
                cancelLabel="Edit phone number"
                codePlaceholder="4–10 digit code"
              />
              {notice ? (
                <Text
                  className="text-sm text-neutral-600"
                  accessibilityLiveRegion="polite"
                >
                  {notice}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="gap-5">
              <View className="gap-2">
                <Text className="text-2xl font-bold text-neutral-900">
                  Verify your phone
                </Text>
                <Text className="text-sm leading-5 text-neutral-600">
                  Used for booking updates, trip coordination and secure
                  WhatsApp booking. Your number is never shared with fleet
                  owners or chauffeurs.
                </Text>
              </View>

              <View>
                <AuthTextInput
                  value={phoneNumber}
                  onChangeText={(value) => {
                    setPhoneNumber(value);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  keyboardType="phone-pad"
                  inputMode="tel"
                  placeholder="+2348012345678"
                  editable={!isSubmitting}
                  accessibilityLabel="Phone number"
                  accessibilityHint="Enter your phone number in international E.164 format"
                  aria-invalid={Boolean(error)}
                  invalid={Boolean(error)}
                  onSubmitEditing={sendCode}
                />
                {error ? (
                  <Text
                    selectable
                    className="mt-1 text-sm text-red-500"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    {error}
                  </Text>
                ) : null}
              </View>

              <Button
                className="h-12 w-full rounded-md bg-neutral-900"
                onPress={sendCode}
                disabled={isSubmitting}
                accessibilityLabel={
                  isSubmitting
                    ? "Sending phone verification code"
                    : "Send phone verification code"
                }
              >
                <Text className="text-sm font-medium text-white">
                  {isSubmitting ? "Sending code…" : "Send verification code"}
                </Text>
              </Button>
            </View>
          )}
          <Button
            variant="link"
            className="mx-auto mt-4"
            onPress={logout}
            disabled={isSubmitting || isLoggingOut}
            accessibilityLabel="Sign out"
          >
            <Text>{isLoggingOut ? "Signing out…" : "Sign out"}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
