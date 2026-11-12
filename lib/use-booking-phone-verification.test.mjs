import assert from "node:assert/strict";
import { mock, test } from "node:test";

const activeIdentity = { current: "guest" };
const setterCalls = Array.from({ length: 8 }, () => []);
let stateIndex = 0;
let resolveGuestCheck;
let requestPhoneVerificationImpl = async () => {
  throw new Error("unexpected authenticated verification request");
};

mock.module("react", {
  namedExports: {
    useCallback: (callback) => callback,
    useEffect: () => undefined,
    useLayoutEffect: () => undefined,
    useRef: () => activeIdentity,
    useState: (initialValue) => {
      const index = stateIndex++;
      const value = index === 2 ? "123456" : initialValue;
      return [value, (nextValue) => setterCalls[index].push(nextValue)];
    },
  },
});

mock.module("@/services/auth", {
  namedExports: {
    checkGuestPhoneVerification: () =>
      new Promise((resolve) => {
        resolveGuestCheck = resolve;
      }),
    checkPhoneVerification: async () => {
      throw new Error("unexpected authenticated verification");
    },
    getAuthErrorMessage: (error) =>
      error instanceof Error ? error.message : "Verification failed",
    requestGuestPhoneVerification: async () => {
      throw new Error("unexpected guest verification request");
    },
    requestPhoneVerification: (...args) =>
      requestPhoneVerificationImpl(...args),
  },
});

const { useBookingPhoneVerification } = await import(
  "../hooks/use-booking-phone-verification.ts"
);

test("ignores a guest verification response after the signed-in identity changes", async () => {
  stateIndex = 0;
  activeIdentity.current = "guest";
  for (const calls of setterCalls) calls.length = 0;
  let onVerifiedCalls = 0;

  const phone = useBookingPhoneVerification({
    isAuthenticated: false,
    identityKey: "guest",
    initialPhoneNumber: "+2348012345678",
    initiallyVerified: false,
    onVerified: async () => {
      onVerifiedCalls += 1;
    },
  });

  const verification = phone.verifyCode();
  activeIdentity.current = "user-1";
  resolveGuestCheck({
    status: "VERIFIED",
    phoneNumber: "**********5678",
    verificationToken: "guest-proof",
  });
  await verification;

  assert.equal(onVerifiedCalls, 0);
  assert.deepEqual(setterCalls[1], []);
  assert.deepEqual(setterCalls[3], []);
  assert.deepEqual(setterCalls[4], []);
  assert.deepEqual(setterCalls[7], [true]);
});

test("refreshes the profile when sending a code returns verified", async () => {
  stateIndex = 0;
  activeIdentity.current = "user-1";
  for (const calls of setterCalls) calls.length = 0;
  requestPhoneVerificationImpl = async () => ({
    status: "VERIFIED",
    phoneNumber: "+2348012345678",
  });
  let onVerifiedCalls = 0;
  let finishRefresh;
  const refresh = new Promise((resolve) => {
    finishRefresh = resolve;
  });

  const phone = useBookingPhoneVerification({
    isAuthenticated: true,
    identityKey: "user-1",
    initialPhoneNumber: "+2348012345678",
    initiallyVerified: false,
    onVerified: async () => {
      onVerifiedCalls += 1;
      await refresh;
    },
  });

  const verification = phone.sendCode();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(onVerifiedCalls, 1);
  assert.deepEqual(setterCalls[4], []);

  finishRefresh();
  await verification;

  assert.deepEqual(setterCalls[4], [true]);
});
