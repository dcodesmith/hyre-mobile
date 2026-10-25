import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { BookingPhoneVerificationController } from "@/hooks/use-booking-phone-verification";
import { PHONE_OTP_MAX_LENGTH } from "@/lib/validations/auth";
import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

export function BookingPhoneVerification({
  phone,
}: {
  readonly phone: BookingPhoneVerificationController;
}) {
  if (phone.phoneVerified) {
    return (
      <View className="mt-6 gap-2">
        <Text className="text-sm font-semibold text-gray-950">Phone Number</Text>
        <View className="flex-row items-center gap-3 rounded-md border border-emerald-700 bg-emerald-50 px-3 py-3">
          <View className="size-8 items-center justify-center rounded-full bg-emerald-700">
            <Check size={16} color="#FFFFFF" />
          </View>
          <View className="min-w-0 flex-1">
            <Text selectable className="text-sm font-medium text-gray-950">
              {phone.phoneNumber}
            </Text>
            <Text className="text-xs text-gray-700">Phone number verified</Text>
          </View>
        </View>
      </View>
    );
  }

  if (phone.maskedPhoneNumber) {
    return (
      <View className="mt-6 gap-2">
        <Text className="text-sm font-semibold text-gray-950">
          Enter Verification Code
        </Text>
        <Text className="text-sm text-gray-600">
          We sent a code to {phone.maskedPhoneNumber}.{" "}
          <Text
            className="text-sm font-medium text-emerald-600"
            onPress={phone.editPhoneNumber}
          >
            Edit number
          </Text>
        </Text>
        <View className="flex-row items-start gap-2">
          <View className="min-w-0 flex-1 gap-1">
            <Input
              value={phone.code}
              onChangeText={phone.setCode}
              placeholder="6-digit code"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={PHONE_OTP_MAX_LENGTH}
              editable={!phone.isSubmitting}
              aria-invalid={Boolean(phone.error)}
              accessibilityLabel="Enter verification code"
              onSubmitEditing={phone.verifyCode}
              className="h-11"
            />
            <Pressable
              disabled={phone.isSubmitting}
              onPress={() => void phone.sendCode(true)}
              accessibilityRole="button"
            >
              <Text className="text-xs text-gray-700 underline">
                Didn&apos;t get it? Resend code
              </Text>
            </Pressable>
          </View>
          <Button
            className="h-11 rounded-md px-4"
            disabled={phone.isSubmitting}
            onPress={phone.verifyCode}
          >
            <Text className="text-sm font-medium text-white">
              {phone.isSubmitting ? "Verifying…" : "Verify"}
            </Text>
          </Button>
        </View>
        {phone.notice ? (
          <Text className="text-sm text-gray-600">{phone.notice}</Text>
        ) : null}
        {phone.error ? (
          <Text
            selectable
            className="text-sm text-red-600"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {phone.error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="mt-6 gap-2">
      <Text className="text-sm font-semibold text-gray-950">Phone Number</Text>
      <Text className="text-sm text-gray-600">
        We&apos;ll send you a code to verify this number
      </Text>
      <View className="flex-row items-center gap-2">
        <Input
          value={phone.phoneNumber}
          onChangeText={phone.setPhoneNumber}
          placeholder="+2348012345678"
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="tel"
          textContentType="telephoneNumber"
          editable={!phone.isSubmitting}
          aria-invalid={Boolean(phone.error)}
          accessibilityLabel="Phone number"
          onSubmitEditing={() => void phone.sendCode()}
          className="h-11 min-w-0 flex-1"
        />
        <Button
          className="h-11 rounded-md px-4"
          disabled={phone.isSubmitting}
          onPress={() => void phone.sendCode()}
        >
          <Text className="text-sm font-medium text-white">
            {phone.isSubmitting ? "Sending…" : "Send code"}
          </Text>
        </Button>
      </View>
      {phone.error ? (
        <Text
          selectable
          className="text-sm text-red-600"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {phone.error}
        </Text>
      ) : null}
    </View>
  );
}
