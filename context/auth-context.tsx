import { createContext, useContext } from "react";

import type { UserProfile } from "@/services/auth";

/**
 * Auth state for the whole app. Supplied by `AuthModalProvider` (`app/_layout.tsx`).
 * Prefer `useAuth()` from `@/hooks/use-auth` for a stable import path.
 */
export type AuthContextValue = {
  isAuthenticated: boolean;
  user: UserProfile | null;
  userEmail: string | null;
  openLoginModal: () => void;
  refreshUser: () => Promise<UserProfile>;
  completePhoneVerification: (
    redirectTo?: string,
    resumePrevious?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  /** True while restoring auth state from storage on app launch */
  isHydrating: boolean;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export const useAuthContext = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuthContext must be used within AuthContext provider");
  }
  return value;
};
