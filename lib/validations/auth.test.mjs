import assert from "node:assert/strict";
import test from "node:test";
import {
  PHONE_NUMBER_ERROR,
  PHONE_OTP_CODE_ERROR,
  PHONE_OTP_MAX_LENGTH,
  PHONE_OTP_MIN_LENGTH,
  emailFormSchema,
  otpFormSchema,
  phoneNumberSchema,
  phoneOtpCodeSchema,
} from "./auth.ts";

test("emailFormSchema matches web normalization and validation", () => {
  const parsed = emailFormSchema.parse({
    email: "  User@Example.COM ",
    referralCode: "abcd2345",
    acceptTerms: true,
  });
  assert.equal(parsed.email, "user@example.com");
  assert.equal(parsed.referralCode, "ABCD2345");

  const invalidEmail = emailFormSchema.safeParse({
    email: "",
    referralCode: "",
    acceptTerms: true,
  });
  assert.equal(invalidEmail.success, false);
  assert.equal(
    invalidEmail.success ? undefined : invalidEmail.error.issues[0]?.message,
    "Email address is not valid.",
  );

  const invalidReferral = emailFormSchema.safeParse({
    email: "user@example.com",
    referralCode: "NOPE",
    acceptTerms: true,
  });
  assert.equal(invalidReferral.success, false);
  assert.equal(
    invalidReferral.success
      ? undefined
      : invalidReferral.error.issues[0]?.message,
    "Referral code must be 8 characters",
  );

  const missingTerms = emailFormSchema.safeParse({
    email: "user@example.com",
    referralCode: "",
    acceptTerms: false,
  });
  assert.equal(missingTerms.success, false);
  assert.equal(
    missingTerms.success ? undefined : missingTerms.error.issues[0]?.message,
    "You must accept the Terms of Service and Privacy Policy",
  );
});

test("otpFormSchema requires a 6-digit code", () => {
  assert.deepEqual(otpFormSchema.parse({ otpCode: "123456" }), {
    otpCode: "123456",
  });

  for (const otpCode of ["12", "1234", "1234567890", " 123456 ", "12a456"]) {
    const rejected = otpFormSchema.safeParse({ otpCode });
    assert.equal(rejected.success, false);
    assert.equal(
      rejected.success ? undefined : rejected.error.issues[0]?.message,
      "Code must be exactly 6 digits.",
    );
  }
});

test("phoneNumberSchema accepts trimmed E.164 numbers only", () => {
  assert.equal(phoneNumberSchema.parse(" +2348012345678 "), "+2348012345678");
  assert.equal(phoneNumberSchema.parse("+12345678"), "+12345678");
  assert.equal(phoneNumberSchema.parse(`+${"1".repeat(15)}`), `+${"1".repeat(15)}`);

  for (const phoneNumber of [
    "08012345678",
    "+1234567",
    `+${"1".repeat(16)}`,
    "+012345678",
    "+234 8012345678",
    "",
    " + ",
  ]) {
    const rejected = phoneNumberSchema.safeParse(phoneNumber);
    assert.equal(rejected.success, false);
    assert.equal(
      rejected.success ? undefined : rejected.error.issues[0]?.message,
      PHONE_NUMBER_ERROR,
    );
  }
});

test("phoneOtpCodeSchema accepts 4 to 10 digits", () => {
  const shortest = "1".repeat(PHONE_OTP_MIN_LENGTH);
  const longest = "1".repeat(PHONE_OTP_MAX_LENGTH);
  assert.equal(phoneOtpCodeSchema.parse(shortest), shortest);
  assert.equal(phoneOtpCodeSchema.parse("123456"), "123456");
  assert.equal(phoneOtpCodeSchema.parse(longest), longest);

  for (const code of [
    "1".repeat(PHONE_OTP_MIN_LENGTH - 1),
    "1".repeat(PHONE_OTP_MAX_LENGTH + 1),
    " 1234 ",
    "12a456",
    "",
  ]) {
    const rejected = phoneOtpCodeSchema.safeParse(code);
    assert.equal(rejected.success, false);
    assert.equal(
      rejected.success ? undefined : rejected.error.issues[0]?.message,
      PHONE_OTP_CODE_ERROR,
    );
  }
});
