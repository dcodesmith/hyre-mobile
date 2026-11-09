import { API_ENDPOINTS } from "@/constants/config";
import {
  ApiError,
  getJsonWithAuth,
  patchJsonWithAuth,
  postJson,
  postJsonWithAuth,
} from "@/lib/api-client";
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
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

export type CurrentUserProfile = {
  name: string | null;
  phoneNumber: string | null;
  city: string | null;
  address: string | null;
  marketingConsent: boolean;
  phoneVerified: boolean;
};

export type UserProfile = Pick<
  AuthenticatedUser,
  "id" | "email" | "roles"
> &
  CurrentUserProfile;

export type UpdateCurrentUserPayload = Pick<
  CurrentUserProfile,
  "name" | "city" | "address" | "marketingConsent"
>;

export type PhoneVerificationResponse = {
  status: "PENDING" | "VERIFIED";
  phoneNumber: string;
};

export type GuestPhoneVerificationResponse = PhoneVerificationResponse & {
  verificationToken?: string;
};

export type VerifyOtpResponse = {
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
  const [{ user }, profile] = await Promise.all([
    getJsonWithAuth<SessionResponse>(API_ENDPOINTS.session, undefined, {
      token,
    }),
    getJsonWithAuth<CurrentUserProfile>(
      API_ENDPOINTS.currentUser,
      undefined,
      { token },
    ),
  ]);
  const sessionUser = requireAuthenticatedUser(user);

  if (typeof profile.phoneVerified !== "boolean") {
    throw new Error("The server did not return phone verification status.");
  }

  return { ...sessionUser, ...profile };
};

export const updateCurrentUser = (profile: UpdateCurrentUserPayload) =>
  patchJsonWithAuth<CurrentUserProfile, UpdateCurrentUserPayload>(
    API_ENDPOINTS.currentUser,
    profile,
  );

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

  if (typeof response.token !== "string" || !response.token) {
    throw new Error("The server did not return a valid access token.");
  }

  return {
    token: response.token,
    user: await fetchCurrentUser(response.token),
  };
};

export const requestPhoneVerification = (phoneNumber: string) =>
  postJsonWithAuth<
    PhoneVerificationResponse,
    { phoneNumber: string }
  >(API_ENDPOINTS.phoneVerifications, { phoneNumber });

export const checkPhoneVerification = (phoneNumber: string, code: string) =>
  postJsonWithAuth<
    PhoneVerificationResponse,
    { phoneNumber: string; code: string }
  >(API_ENDPOINTS.phoneVerificationChecks, { phoneNumber, code });

export const requestGuestPhoneVerification = (phoneNumber: string) =>
  postJson<GuestPhoneVerificationResponse, { phoneNumber: string }>(
    API_ENDPOINTS.guestPhoneVerifications,
    { phoneNumber },
  );

export const checkGuestPhoneVerification = (
  phoneNumber: string,
  code: string,
) =>
  postJson<
    GuestPhoneVerificationResponse,
    { phoneNumber: string; code: string }
  >(API_ENDPOINTS.guestPhoneVerificationChecks, { phoneNumber, code });

export const logout = (token: string) => {
  return postJsonWithAuth<{ success: boolean }, Record<string, never>>(
    API_ENDPOINTS.logout,
    {},
    undefined,
    { token },
  );
};
