import { API_BASE_URL, API_TIMEOUT_MS } from "@/constants/config";
import { deleteSavedAuthToken } from "@/storage/auth-token";

export class ApiError extends Error {
	readonly status: number;
	readonly data?: unknown;

	constructor(
		message: string,
		{ status, data }: { status: number; data?: unknown },
	) {
		super(message);
		this.status = status;
		this.data = data;
		Object.setPrototypeOf(this, ApiError.prototype);
	}
}

const withTimeout = async <T>(
	promise: Promise<T>,
	timeout: number,
): Promise<T> => {
	if (!timeout) {
		return promise;
	}

	return new Promise<T>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new ApiError("Request timed out", { status: 408 }));
		}, timeout);

		promise
			.then((value) => {
				clearTimeout(timeoutId);
				resolve(value);
			})
			.catch((error) => {
				clearTimeout(timeoutId);
				reject(error);
			});
	});
};

const buildUrl = (path: string) => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	return `${API_BASE_URL}${normalizedPath}`;
};

const parseResponseBody = async (response: Response) => {
	const text = await response.text();

	if (!text) {
		return undefined;
	}

	try {
		return JSON.parse(text);
	} catch (error) {
		return text;
	}
};

export const apiRequest = async <T>(
	path: string,
	init: RequestInit | undefined = undefined,
	{ timeout = API_TIMEOUT_MS }: { timeout?: number } = {},
): Promise<T> => {
	const headers = new Headers(init?.headers);
	headers.set("Accept", "application/json");
	if (init?.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await withTimeout(
		fetch(buildUrl(path), {
			...init,
			headers,
		}),
		timeout,
	);

	const payload = await parseResponseBody(response);

	if (!response.ok) {
		const message =
			(typeof payload === "object" &&
			payload !== null &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: undefined) ?? `Request failed with status ${response.status}`;

		throw new ApiError(message, { status: response.status, data: payload });
	}

	return payload as T;
};

export const getJson = async <T>(
	path: string,
	init?: RequestInit,
	config?: { timeout?: number },
) => {
	return apiRequest<T>(
		path,
		{
			...init,
			method: "GET",
		},
		config,
	);
};

export const postJson = async <TResponse, TBody = unknown>(
	path: string,
	body: TBody,
	init?: RequestInit,
	config?: { timeout?: number },
) => {
	try {
		const response = await apiRequest<TResponse>(
			path,
			{
				...init,
				method: "POST",
				body: JSON.stringify(body),
			},
			config,
		);
		return response;
	} catch (error) {
		console.error("Error in postJson", error);
		if (error instanceof ApiError && error.status === 401) {
			await deleteSavedAuthToken();
		}
		throw error;
	}
};
