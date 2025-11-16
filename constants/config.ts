import Constants from "expo-constants";

const DEFAULT_BASE_URL = "http://localhost:3000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const getDevServerHostname = () => {
	const legacyManifest = (Constants as { manifest?: { debuggerHost?: string } })
		.manifest;
	const hostUri = Constants.expoConfig?.hostUri ?? legacyManifest?.debuggerHost;

	if (!hostUri) {
		return null;
	}

	const hostWithPort = hostUri.includes("://")
		? new URL(hostUri).host
		: hostUri;
	return hostWithPort.split(":")[0] ?? null;
};

const normalizeBaseUrl = (value: string) => {
	if (!value) {
		return DEFAULT_BASE_URL;
	}

	try {
		const url = new URL(value);

		if (__DEV__ && LOCAL_HOSTNAMES.has(url.hostname)) {
			const devHost = getDevServerHostname();
			if (devHost) {
				url.hostname = devHost;
			}
		}

		return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
	} catch {
		return value.endsWith("/") ? value.slice(0, -1) : value;
	}
};

export const API_BASE_URL = normalizeBaseUrl(
	(process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL).trim(),
);

export const API_ENDPOINTS = {
	requestOtp: "/auth/otp",
	verifyOtp: "/auth/verify",
	currentUser: "/users/me",
	logout: "/auth/logout",
} as const;

export const API_TIMEOUT_MS = Number(
	process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 10000,
);
