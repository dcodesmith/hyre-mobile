import { API_ENDPOINTS } from "@/constants/config";
import {
  ApiError,
  getJsonWithAuth,
  postJson,
  postJsonWithAuth,
} from "@/lib/api-client";
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
  resolveAuthenticatedSession,
} from "@/lib/auth-session";

/** Maps backend error codes to user-friendly messages. Falls back to error.message. */
export const getAuthErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_OTP") {
      return "Invalid or expired code. Please try again.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === "Network request failed") {
      return "Unable to connect. Ensure the backend is running. If using a simulator, try setting EXPO_PUBLIC_API_BASE_URL to your machine's IP (e.g. http://192.168.1.x:3000) in .env.";
    }

    return error.message;
  }

  return fallback;
};

export const AUTH_DEFAULTS = {
  role: "user",
  otpType: "sign-in",
} as const;

export type RequestOtpResponse = {
  success: boolean;
};

export type UserProfile = AuthenticatedUser;

export type VerifyOtpResponse = {
  user?: UserProfile;
  token?: string;
};

export const requestOtp = (
  email: string,
  role: string = AUTH_DEFAULTS.role,
) => {
  return postJson<
    RequestOtpResponse,
    { email: string; type: string; role: string }
  >(API_ENDPOINTS.requestOtp, { email, type: AUTH_DEFAULTS.otpType, role });
};

export type VerifyOtpPayload = {
  email: string;
  otpCode: string;
  role?: string;
};

type SessionResponse = {
  user: unknown;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
    [key: string]: unknown;
  };
};

export const fetchCurrentUser = async (token: string) => {
  const { user } = await getJsonWithAuth<SessionResponse>(
    API_ENDPOINTS.session,
    undefined,
    { token },
  );

  return requireAuthenticatedUser(user);
};

export const verifyOtp = async ({
  email,
  otpCode,
  role = AUTH_DEFAULTS.role,
}: VerifyOtpPayload): Promise<{
  token: string;
  user: UserProfile;
}> => {
  const response = await postJson<
    VerifyOtpResponse,
    { email: string; otp: string; role: string }
  >(API_ENDPOINTS.verifyOtp, {
    email,
    otp: otpCode,
    role,
  });

  return resolveAuthenticatedSession(response, fetchCurrentUser);
};

export const logout = (token: string) => {
  return postJsonWithAuth<{ success: boolean }, Record<string, never>>(
    API_ENDPOINTS.logout,
    {},
    undefined,
    { token },
  );
};
