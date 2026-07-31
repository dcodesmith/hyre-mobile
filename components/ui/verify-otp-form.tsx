import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import * as React from "react";
import { type TextStyle, View } from "react-native";

const RESEND_CODE_INTERVAL_SECONDS = 30;

const TABULAR_NUMBERS_STYLE: TextStyle = { fontVariant: ["tabular-nums"] };

type VerifyOtpFormProps = {
  title?: string;
  description?: string;
  otpCode: string;
  onOtpCodeChange: (code: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onResendCode: () => void;
  isSubmitting: boolean;
  error: string | null;
  previewCode?: string | null;
};

export function VerifyOtpForm({
  title = "Verify your email",
  description,
  otpCode,
  onOtpCodeChange,
  onSubmit,
  onCancel,
  onResendCode,
  isSubmitting,
  error,
  previewCode,
}: Readonly<VerifyOtpFormProps>) {
  const { countdown, restartCountdown } = useCountdown(
    RESEND_CODE_INTERVAL_SECONDS,
  );

  const handleResend = () => {
    onResendCode();
    restartCountdown();
  };

  return (
    <View className="gap-6 w-full">
      <View className="gap-2">
        <Text
          variant="h2"
          className="text-2xl font-bold text-center sm:text-left"
        >
          {title}
        </Text>
        {!!description && (
          <Text variant="muted" className="text-center sm:text-left">
            {description}
          </Text>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="text-base font-semibold">Verification code</Text>
        <Input
          id="code"
          value={otpCode}
          onChangeText={onOtpCodeChange}
          autoCapitalize="none"
          returnKeyType="done"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          editable={!isSubmitting}
          aria-invalid={!!error}
          className="w-full"
          placeholder="000000"
        />
        {!!previewCode && (
          <Text variant="small" className="text-muted-foreground">
            Test code: {previewCode}
          </Text>
        )}
        {!!error && (
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        )}
        <Button
          variant="link"
          size="sm"
          disabled={countdown > 0 || isSubmitting}
          onPress={handleResend}
        >
          <Text className="text-xs">
            Didn&apos;t receive the code? Resend{" "}
            {countdown > 0 ? (
              <Text className="text-xs" style={TABULAR_NUMBERS_STYLE}>
                ({countdown})
              </Text>
            ) : null}
          </Text>
        </Button>
      </View>
      <View className="gap-3">
        <Button
          className="w-full"
          onPress={onSubmit}
          disabled={isSubmitting || otpCode.trim().length < 4}
        >
          <Text>{isSubmitting ? "Verifying..." : "Continue"}</Text>
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
  );
}

function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(seconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = React.useCallback(() => {
    setCountdown(seconds);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  React.useEffect(() => {
    startCountdown();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startCountdown]);

  return { countdown, restartCountdown: startCountdown };
}
