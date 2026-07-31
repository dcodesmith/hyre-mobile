import { AuthModalSheet } from "@/components/auth/auth-modal-sheet";
import { AuthContext } from "@/context/auth-context";
import { AuthModalContext } from "@/providers/auth-modal-context";
import { useAuthModalController } from "@/providers/use-auth-modal-controller";
import type { PropsWithChildren } from "react";

export const AuthModalProvider = ({ children }: PropsWithChildren) => {
  const { authContextValue, modalContextValue, sheetProps } =
    useAuthModalController();

  return (
    <AuthContext.Provider value={authContextValue}>
      <AuthModalContext.Provider value={modalContextValue}>
        {children}
        <AuthModalSheet {...sheetProps} />
      </AuthModalContext.Provider>
    </AuthContext.Provider>
  );
};

export { useAuthModal } from "@/providers/auth-modal-context";
