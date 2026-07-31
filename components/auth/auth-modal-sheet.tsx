import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VerifyOtpForm } from "@/components/ui/verify-otp-form";
import type { EmailFormValues } from "@/lib/validations/auth";
import { type Control, Controller } from "react-hook-form";
import { View } from "react-native";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";

export type AuthModalSheetProps = {
  isModalVisible: boolean;
  isEmailModalVisible: boolean;
  isOtpModalVisible: boolean;
  pendingEmail: string | null;
  isRequestingOtp: boolean;
  isVerifyingOtp: boolean;
  emailValidationError?: string;
  emailError: string | null;
  otpError: string | null;
  emailControl: Control<Pick<EmailFormValues, "email">>;
  onEmailChange: (text: string, onChange: (value: string) => void) => void;
  onEmailSubmit: () => void;
  onClose: () => void;
  otpCode: string;
  onOtpCodeChange: (code: string) => void;
  onOtpSubmit: () => void;
  onResendCode: () => Promise<void>;
};

export function AuthModalSheet({
  isModalVisible,
  isEmailModalVisible,
  isOtpModalVisible,
  pendingEmail,
  isRequestingOtp,
  isVerifyingOtp,
  emailValidationError,
  emailError,
  otpError,
  emailControl,
  onEmailChange,
  onEmailSubmit,
  onClose,
  otpCode,
  onOtpCodeChange,
  onOtpSubmit,
  onResendCode,
}: Readonly<AuthModalSheetProps>) {
  if (!isModalVisible) {
    return null;
  }

  return (
    <BottomSheet
      open={isModalVisible}
      onOpenChange={(open: boolean) => !open && onClose()}
    >
      <BottomSheetContent className="px-6 py-8">
        {isEmailModalVisible && (
          <Animated.View
            entering={FadeInRight.duration(200)}
            exiting={FadeOutLeft.duration(200)}
            style={{ width: "100%" }}
          >
            <View className="gap-6 w-full">
              <View className="gap-2">
                <Text
                  variant="h2"
                  className="text-2xl font-bold text-center sm:text-left"
                >
                  Log in
                </Text>
                <Text variant="muted" className="text-center sm:text-left">
                  Enter the email associated with your account and we will send
                  you a one-time passcode.
                </Text>
              </View>

              <View className="gap-1.5">
                <Text className="text-base font-semibold">Email address</Text>
                <Controller
                  control={emailControl}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      id="email"
                      value={value}
                      onChangeText={(text) => onEmailChange(text, onChange)}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="name@company.com"
                      autoComplete="email"
                      editable={!isRequestingOtp}
                      aria-invalid={!!emailValidationError || !!emailError}
                      className="w-full"
                    />
                  )}
                />
                {!!emailValidationError && (
                  <Text variant="small" className="text-destructive">
                    {emailValidationError}
                  </Text>
                )}
                {!!emailError && !emailValidationError && (
                  <Text variant="small" className="text-destructive">
                    {emailError}
                  </Text>
                )}
              </View>

              <View className="gap-3">
                <Button
                  className="w-full"
                  onPress={onEmailSubmit}
                  disabled={isRequestingOtp}
                >
                  <Text>{isRequestingOtp ? "Sending..." : "Send code"}</Text>
                </Button>
                <Button
                  variant="link"
                  className="mx-auto"
                  onPress={onClose}
                  disabled={isRequestingOtp}
                >
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          </Animated.View>
        )}

        {isOtpModalVisible && (
          <Animated.View
            entering={FadeInRight.duration(200)}
            exiting={FadeOutLeft.duration(200)}
            style={{ width: "100%" }}
          >
            <VerifyOtpForm
              title="Enter your code"
              description={
                pendingEmail
                  ? `Enter the verification code sent to ${pendingEmail}`
                  : undefined
              }
              otpCode={otpCode}
              onOtpCodeChange={onOtpCodeChange}
              onSubmit={onOtpSubmit}
              onCancel={onClose}
              onResendCode={onResendCode}
              isSubmitting={isVerifyingOtp}
              error={otpError}
            />
          </Animated.View>
        )}
      </BottomSheetContent>
    </BottomSheet>
  );
}
