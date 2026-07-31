import assert from "node:assert/strict";
import test from "node:test";
import { emailFormSchema, otpFormSchema } from "./auth.ts";

test("emailFormSchema normalizes email and requires terms acceptance", () => {
  const parsed = emailFormSchema.parse({
    email: "  User@Example.COM ",
    acceptTerms: true,
  });
  assert.equal(parsed.email, "user@example.com");

  const rejected = emailFormSchema.safeParse({
    email: "user@example.com",
    acceptTerms: false,
  });
  assert.equal(rejected.success, false);
});

test("otpFormSchema requires a trimmed code", () => {
  const parsed = otpFormSchema.parse({ otpCode: " 1234 " });
  assert.equal(parsed.otpCode, "1234");

  const rejected = otpFormSchema.safeParse({ otpCode: "12" });
  assert.equal(rejected.success, false);
});
