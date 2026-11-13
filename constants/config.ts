import Constants from "expo-constants";

import { isExpoAndroid } from "@/lib/expo-platform";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_PUBLIC_WEB_ORIGIN = "https://tripidly.com";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const ANDROID_EMULATOR_HOST = "10.0.2.2";

const getDevServerHostname = () => {
  const legacyManifest = (Constants as { manifest?: { debuggerHost?: string } })
    .manifest;
  const hostUri = Constants.expoConfig?.hostUri ?? legacyManifest?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const hostWithPort = hostUri.includes("://")
    ? new URL(hostUri).host
    : hostUri;
  return hostWithPort.split(":")[0] ?? null;
};

const normalizeBaseUrl = (value: string) => {
  if (!value) {
    return DEFAULT_BASE_URL;
  }

  try {
    const url = new URL(value);
    const originalHost = url.hostname;

    // `0.0.0.0` is only for server listen addresses; fetch() cannot use it as a host.
    if (url.hostname === "0.0.0.0") {
      url.hostname = "127.0.0.1";
    }

    // In dev, rewrite loopback hosts so they actually reach the Mac from the device:
    // - prefer Expo dev host LAN IP when available (Wi‑Fi / `--lan`)
    // - else on Android: only auto-rewrite the ambiguous `localhost` to the emulator
    //   alias `10.0.2.2`. `127.0.0.1` is treated as explicit (physical device + `adb
    //   reverse tcp:3000 tcp:3000` workflow documented in `.env.example`).
    if (__DEV__ && LOCAL_HOSTNAMES.has(url.hostname)) {
      const devHost = getDevServerHostname();
      if (devHost && !LOCAL_HOSTNAMES.has(devHost)) {
        url.hostname = devHost;
      } else if (isExpoAndroid && originalHost === "localhost") {
        url.hostname = ANDROID_EMULATOR_HOST;
      }
    }

    return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
  } catch {
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }
};

export const API_BASE_URL = normalizeBaseUrl(
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL).trim(),
);

export const PUBLIC_WEB_ORIGIN = (
  process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim() || DEFAULT_PUBLIC_WEB_ORIGIN
).replace(/\/+$/, "");

/**
 * Sent as the `Origin` header on every API request. Better Auth (hyre-worker-nestjs) still
 * validates `Origin` for many requests; React Native `fetch` does not set it automatically.
 *
 * Defaults to the same origin as `API_BASE_URL`, which matches typical `TRUSTED_ORIGINS` on
 * the worker (e.g. `http://localhost:3000`). Override with `EXPO_PUBLIC_TRUSTED_ORIGIN` if
 * your worker’s `TRUSTED_ORIGINS` expects a different entry (e.g. a dedicated web app URL).
 */
export const TRUSTED_REQUEST_ORIGIN = (() => {
  const fromEnv = process.env.EXPO_PUBLIC_TRUSTED_ORIGIN?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "http://localhost:3000";
  }
})();

export const API_ENDPOINTS = {
  requestOtp: "/api/auth/email-otp/send-verification-otp",
  verifyOtp: "/api/auth/sign-in/email-otp",
  session: "/auth/session",
  logout: "/api/auth/sign-out",
  currentUser: "/api/users/me",
  accountDelete: "/api/account/delete",
  phoneVerifications: "/api/users/me/phone-verifications",
  phoneVerificationChecks: "/api/users/me/phone-verification-checks",
  guestPhoneVerifications: "/api/bookings/guest-phone-verifications",
  guestPhoneVerificationChecks: "/api/bookings/guest-phone-verification-checks",
  pushTokens: "/api/users/me/push-tokens",
  referralsUser: "/api/referrals/user",
} as const;

export const API_TIMEOUT_MS = Number(
  process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 10000,
);
