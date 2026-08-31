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

/** Maps backend errors to the same user-facing copy as web. */
export const getAuthErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408 || error.status >= 500) {
      return "Something went wrong. Please try again.";
    }
    if (error.status === 403) {
      return "We couldn't start the login process. Please check your details and try again.";
    }
    if (error.status === 429) {
      return error.retryAfter
        ? `Too many attempts. Try again in ${error.retryAfter} seconds.`
        : "Too many attempts. Please try again shortly.";
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
