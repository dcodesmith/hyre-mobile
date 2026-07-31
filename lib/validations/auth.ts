import { z } from "zod";

export const authEmailSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .refine((val) => val.length > 0, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."));

export const otpCodeSchema = z
  .string()
  .min(4, "Enter the code we sent to your email.")
  .transform((val) => val.trim());

export const emailFormSchema = z.object({
  email: authEmailSchema,
  referralCode: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service and Privacy Policy.",
  }),
});

export const otpFormSchema = z.object({
  otpCode: otpCodeSchema,
});

export type EmailFormValues = z.infer<typeof emailFormSchema>;
export type OtpFormValues = z.infer<typeof otpFormSchema>;
