import type { UserProfile } from "@/services/auth";
import { createContext, useContext } from "react";

export type AuthModalContextValue = {
  openLoginModal: () => void;
  closeLoginModal: () => void;
  completeLogin: (token: string, profile: UserProfile) => Promise<void>;
  isEmailModalVisible: boolean;
  isOtpModalVisible: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  authToken: string | null;
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
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
