import { z } from "zod";

export const EMAIL_INVALID_ERROR = "Email address is not valid.";
export const TERMS_ACCEPTANCE_ERROR =
  "You must accept the Terms of Service and Privacy Policy";
export const REFERRAL_CODE_PATTERN =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
export const OTP_CODE_ERROR = "Code must be exactly 6 digits.";

export const authEmailSchema = z
  .string({ error: EMAIL_INVALID_ERROR })
  .trim()
  .toLowerCase()
  .pipe(z.email(EMAIL_INVALID_ERROR));

const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(REFERRAL_CODE_PATTERN, "Referral code must be 8 characters")
  .optional()
  .or(z.literal(""));

export const otpCodeSchema = z
  .string({ error: OTP_CODE_ERROR })
  .regex(/^\d{6}$/, OTP_CODE_ERROR);

export const PHONE_NUMBER_ERROR =
  "Enter a phone number in E.164 format, for example +2348012345678.";
export const PHONE_OTP_CODE_ERROR = "Code must be 4 to 10 digits.";
export const PHONE_OTP_MIN_LENGTH = 4;
export const PHONE_OTP_MAX_LENGTH = 10;

export const phoneNumberSchema = z
  .string({ error: PHONE_NUMBER_ERROR })
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, PHONE_NUMBER_ERROR);

export const phoneOtpCodeSchema = z
  .string({ error: PHONE_OTP_CODE_ERROR })
  .regex(/^\d{4,10}$/, PHONE_OTP_CODE_ERROR);

export const emailFormSchema = z.object({
  email: authEmailSchema,
  referralCode: referralCodeSchema,
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: TERMS_ACCEPTANCE_ERROR,
  }),
});

export const otpFormSchema = z.object({
  otpCode: otpCodeSchema,
});

export type EmailFormValues = z.infer<typeof emailFormSchema>;
export type OtpFormValues = z.infer<typeof otpFormSchema>;
