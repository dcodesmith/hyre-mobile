export const DEFAULT_OTP_CODE_LENGTH = 6;

/** Email OTP stays exactly 6 digits unless a caller passes another range. */
export function canSubmitOtpCode(
  otpCode: string,
  minCodeLength = DEFAULT_OTP_CODE_LENGTH,
  maxCodeLength = DEFAULT_OTP_CODE_LENGTH,
): boolean {
  return otpCode.length >= minCodeLength && otpCode.length <= maxCodeLength;
}
