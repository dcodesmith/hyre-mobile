import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_OTP_CODE_LENGTH, canSubmitOtpCode } from "./otp-code.ts";

test("email OTP defaults to exactly 6 digits", () => {
  assert.equal(DEFAULT_OTP_CODE_LENGTH, 6);
  assert.equal(canSubmitOtpCode("123456"), true);
  assert.equal(canSubmitOtpCode("12345"), false);
  assert.equal(canSubmitOtpCode("1234567"), false);
  assert.equal(canSubmitOtpCode(""), false);
  assert.equal(canSubmitOtpCode("1234"), false);
  assert.equal(canSubmitOtpCode("1234567890"), false);
});

test("phone OTP accepts a configured 4 to 10 digit range", () => {
  assert.equal(canSubmitOtpCode("1234", 4, 10), true);
  assert.equal(canSubmitOtpCode("123456", 4, 10), true);
  assert.equal(canSubmitOtpCode("1234567890", 4, 10), true);
  assert.equal(canSubmitOtpCode("123", 4, 10), false);
  assert.equal(canSubmitOtpCode("12345678901", 4, 10), false);
});
