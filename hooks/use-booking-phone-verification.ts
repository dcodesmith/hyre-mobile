import {
  checkGuestPhoneVerification,
  checkPhoneVerification,
  getAuthErrorMessage,
  requestGuestPhoneVerification,
  requestPhoneVerification,
} from "@/services/auth";
import {
  PHONE_OTP_MAX_LENGTH,
  phoneNumberSchema,
  phoneOtpCodeSchema,
} from "@/lib/validations/auth";
import { normalizePhoneOtpInput } from "@/lib/phone-verification-continuation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

function verificationErrorMessage(error: unknown) {
  return getAuthErrorMessage(
    error,
    error instanceof Error ? error.message : undefined,
  );
}

type UseBookingPhoneVerificationArgs = {
  isAuthenticated: boolean;
  identityKey: string;
  initialPhoneNumber: string;
  initiallyVerified: boolean;
  onVerified?: () => Promise<unknown>;
};

export function useBookingPhoneVerification({
  isAuthenticated,
  identityKey,
  initialPhoneNumber,
  initiallyVerified,
  onVerified,
}: UseBookingPhoneVerificationArgs) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [maskedPhoneNumber, setMaskedPhoneNumber] = useState<string | null>(null);
  const [code, setCodeState] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(initiallyVerified);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const identityRef = useRef(identityKey);
  useLayoutEffect(() => {
    identityRef.current = identityKey;
  }, [identityKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset transient state when the account identity changes
  useEffect(() => {
    setPhoneNumber(initialPhoneNumber);
    setMaskedPhoneNumber(null);
    setCodeState("");
    setVerificationToken(null);
    setPhoneVerified(initiallyVerified);
    setError(null);
    setNotice(null);
    setIsSubmitting(false);
  }, [identityKey, initialPhoneNumber, initiallyVerified]);

  const sendCode = useCallback(
    async (isResend = false) => {
      const parsed = phoneNumberSchema.safeParse(phoneNumber);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number.");
        return;
      }

      setError(null);
      setNotice(null);
      setIsSubmitting(true);
      const requestIdentity = identityKey;
      try {
        const response = isAuthenticated
          ? await requestPhoneVerification(parsed.data)
          : await requestGuestPhoneVerification(parsed.data);
        if (identityRef.current !== requestIdentity) return;
        setPhoneNumber(parsed.data);
        setMaskedPhoneNumber(response.phoneNumber);
        setVerificationToken(null);
        const verified = response.status === "VERIFIED" && isAuthenticated;
        if (verified) {
          await onVerified?.();
          if (identityRef.current !== requestIdentity) return;
        }
        setPhoneVerified(verified);
        if (isResend) setNotice("A new code is on its way.");
      } catch (requestError) {
        if (identityRef.current === requestIdentity) {
          setError(verificationErrorMessage(requestError));
        }
      } finally {
        if (identityRef.current === requestIdentity) {
          setIsSubmitting(false);
        }
      }
    },
    [identityKey, isAuthenticated, onVerified, phoneNumber],
  );

  const verifyCode = useCallback(async () => {
    const parsedCode = phoneOtpCodeSchema.safeParse(code);
    if (!parsedCode.success) {
      setError(parsedCode.error.issues[0]?.message ?? "Enter a valid code.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    const requestIdentity = identityKey;
    try {
      const response = isAuthenticated
        ? await checkPhoneVerification(phoneNumber, parsedCode.data)
        : await checkGuestPhoneVerification(phoneNumber, parsedCode.data);
      if (identityRef.current !== requestIdentity) return;
      const token =
        "verificationToken" in response &&
        typeof response.verificationToken === "string" &&
        response.verificationToken
          ? response.verificationToken
          : null;
      if (response.status !== "VERIFIED" || (!isAuthenticated && !token)) {
        throw new Error("Your phone number has not been verified yet.");
      }
      await onVerified?.();
      if (identityRef.current !== requestIdentity) return;
      setMaskedPhoneNumber(response.phoneNumber);
      setVerificationToken(token);
      setPhoneVerified(true);
    } catch (verificationError) {
      if (identityRef.current === requestIdentity) {
        setError(verificationErrorMessage(verificationError));
      }
    } finally {
      if (identityRef.current === requestIdentity) {
        setIsSubmitting(false);
      }
    }
  }, [code, identityKey, isAuthenticated, onVerified, phoneNumber]);

  const editPhoneNumber = useCallback(() => {
    setMaskedPhoneNumber(null);
    setCodeState("");
    setVerificationToken(null);
    setPhoneVerified(false);
    setError(null);
    setNotice(null);
  }, []);

  const reset = useCallback(() => {
    setMaskedPhoneNumber(null);
    setCodeState("");
    setVerificationToken(null);
    setPhoneVerified(false);
    setError("Your verification expired. Please verify your phone again.");
    setNotice(null);
  }, []);

  return {
    phoneNumber,
    setPhoneNumber: (value: string) => {
      setPhoneNumber(value);
      setError(null);
    },
    maskedPhoneNumber,
    code,
    setCode: (value: string) => {
      setCodeState(normalizePhoneOtpInput(value, PHONE_OTP_MAX_LENGTH));
      setError(null);
      setNotice(null);
    },
    verificationToken,
    phoneVerified,
    error,
    notice,
    isSubmitting,
    sendCode,
    verifyCode,
    editPhoneNumber,
    reset,
  };
}

export type BookingPhoneVerificationController = ReturnType<
  typeof useBookingPhoneVerification
>;
