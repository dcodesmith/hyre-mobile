import assert from "node:assert/strict";
import test from "node:test";
import { emailFormSchema, otpFormSchema } from "./auth.ts";

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

  for (const otpCode of ["12", "1234", " 123456 ", "12a456"]) {
    const rejected = otpFormSchema.safeParse({ otpCode });
    assert.equal(rejected.success, false);
    assert.equal(
      rejected.success ? undefined : rejected.error.issues[0]?.message,
      "Code must be exactly 6 digits.",
    );
  }
});
