import { API_ENDPOINTS } from "@/constants/config";
import { getJson, postJson } from "@/lib/api-client";

export const AUTH_DEFAULTS = {
	role: "customer",
} as const;

export type RequestOtpResponse = {
	code?: string;
	expiresInSeconds?: number;
	message?: string;
	success?: boolean;
};

export type TokenPair = {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
};

export type AuthUser = {
	id: string;
	email: string;
	phoneNumber: string;
	name?: string;
	roles: string[];
	approvalStatus: string;
	hasOnboarded: boolean;
};

export type LoginResponse = {
	success: boolean;
	user?: AuthUser;
	tokens?: TokenPair;
	message: string;
};

export const requestOtp = (
	email: string,
	role: string = AUTH_DEFAULTS.role,
) => {
	return postJson<RequestOtpResponse, { email: string; role: string }>(
		API_ENDPOINTS.requestOtp,
		{ email, role },
	);
};

export type VerifyOtpPayload = {
	email: string;
	otpCode: string;
	role?: string;
};

export const verifyOtp = ({
	email,
	otpCode,
	role = AUTH_DEFAULTS.role,
}: VerifyOtpPayload) => {
	return postJson<
		LoginResponse,
		{ email: string; otpCode: string; role: string }
	>(API_ENDPOINTS.verifyOtp, {
		email,
		otpCode,
		role,
	});
};

export type UserProfile = {
	id?: string;
	email?: string;
	name?: string;
	[key: string]: unknown;
};

export const fetchCurrentUser = (token: string) => {
	return getJson<UserProfile>(API_ENDPOINTS.currentUser, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

export const logout = (token: string) => {
	return postJson<{ success: boolean; message?: string }, undefined>(
		API_ENDPOINTS.logout,
		undefined,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);
};
