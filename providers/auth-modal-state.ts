import type { UserProfile } from "@/services/auth";

export type AuthModalUiState = {
  isEmailModalVisible: boolean;
  isOtpModalVisible: boolean;
  pendingEmail: string | null;
  isRequestingOtp: boolean;
  isVerifyingOtp: boolean;
  emailError: string | null;
  otpError: string | null;
  isLoggingOut: boolean;
  isHydrating: boolean;
};

export type AuthModalUiAction = {
  type: "patch";
  payload: Partial<AuthModalUiState>;
};

export const initialAuthModalUiState: AuthModalUiState = {
  isEmailModalVisible: false,
  isOtpModalVisible: false,
  pendingEmail: null,
  isRequestingOtp: false,
  isVerifyingOtp: false,
  emailError: null,
  otpError: null,
  isLoggingOut: false,
  isHydrating: true,
};

export type AuthSessionState = {
  authToken: string | null;
  user: UserProfile | null;
};

export type AuthSessionAction = {
  type: "patch";
  payload: Partial<AuthSessionState>;
};

export const initialAuthSessionState: AuthSessionState = {
  authToken: null,
  user: null,
};

export function patchState<T extends object>(state: T, payload: Partial<T>): T {
  return { ...state, ...payload };
}

export function authModalUiReducer(
  state: AuthModalUiState,
  action: AuthModalUiAction,
): AuthModalUiState {
  if (action.type === "patch") {
    return patchState(state, action.payload);
  }

  return state;
}
