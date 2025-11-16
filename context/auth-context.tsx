import { createContext, useContext } from "react";

import type { UserProfile } from "@/services/auth";

export type AuthContextValue = {
	isAuthenticated: boolean;
	user: UserProfile | null;
	userEmail: string | null;
	openLoginModal: () => void;
	logout: () => Promise<void>;
	isLoggingOut: boolean;
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

