import type { UserProfile } from "@/services/auth";
import { createContext, useContext } from "react";

export type AuthModalContextValue = {
  openLoginModal: () => void;
  closeLoginModal: () => void;
  requestLoginOtp: (email: string) => Promise<void>;
  verifyLoginOtp: (
    otpCode: string,
    redirectTo?: string,
  ) => Promise<void>;
  isEmailModalVisible: boolean;
  isOtpModalVisible: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  authToken: string | null;
  pendingEmail: string | null;
};

export const AuthModalContext = createContext<
  AuthModalContextValue | undefined
>(undefined);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);

  if (!context) {
    throw new Error("useAuthModal must be used inside AuthModalProvider");
  }

  return context;
};
