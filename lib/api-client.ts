import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  TRUSTED_REQUEST_ORIGIN,
} from "@/constants/config";
import { invalidateAuthSession } from "@/lib/auth-session-events";
import { reportApiFailure } from "@/lib/telemetry";
import {
  deleteSavedAuthTokenIfMatches,
  getSavedAuthToken,
} from "@/storage/auth-token";

export class ApiError extends Error {
  readonly status: number;
  readonly data?: unknown;
  /** Backend error code if present (e.g. "INVALID_OTP") */
  readonly code?: string;

  constructor(
    message: string,
    { status, data }: { status: number; data?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = extractErrorCode(data);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const REQUEST_CANCELLED_CODE = "REQUEST_CANCELLED";

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

/** Nest uses `errorCode`; some auth routes use `code`. */
const extractErrorCode = (payload: unknown): string | undefined => {
  if (typeof payload !== "object" || payload === null) return undefined;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.errorCode === "string") return obj.errorCode;
  if (typeof obj.code === "string") return obj.code;
  return undefined;
};

/** Extracts user-facing message from backend error payload (message, detail, or fallback). */
const extractErrorMessage = (payload: unknown, status: number): string => {
  if (typeof payload === "object" && payload !== null) {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.detail === "string") return obj.detail;
  }
  return `Request failed with status ${status}`;
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isAbortError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "AbortError";

const createRequestCancelledError = (error: unknown) =>
  new ApiError("Request cancelled", {
    status: 0,
    data: {
      code: REQUEST_CANCELLED_CODE,
      cause: error instanceof Error ? error.message : undefined,
    },
  });

const getNetworkErrorData = (error: unknown) => ({
  code: "NETWORK_ERROR",
  cause: error instanceof Error ? error.message : undefined,
});

export const apiRequest = async <T>(
  path: string,
  init: RequestInit | undefined = undefined,
  { timeout = API_TIMEOUT_MS }: { timeout?: number } = {},
): Promise<T> => {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Client-Type", "mobile");
  if (!headers.has("Origin")) {
    headers.set("Origin", TRUSTED_REQUEST_ORIGIN);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await withTimeout(
      fetch(buildUrl(path), {
        ...init,
        headers,
      }),
      timeout,
    );
  } catch (error) {
    if (init?.signal?.aborted || isAbortError(error)) {
      throw createRequestCancelledError(error);
    }
    if (error instanceof ApiError) {
      reportApiFailure(error, { method, path });
      throw error;
    }

    const networkError = new ApiError("Network request failed", {
      status: 0,
      data: getNetworkErrorData(error),
    });
    reportApiFailure(networkError, { method, path });
    throw networkError;
  }

  let payload: unknown;
  try {
    payload = await parseResponseBody(response);
  } catch (error) {
    if (init?.signal?.aborted || isAbortError(error)) {
      throw createRequestCancelledError(error);
    }
    const apiError = new ApiError("Failed to read response", {
      status: response.ok ? 0 : response.status,
      data: getNetworkErrorData(error),
    });
    reportApiFailure(apiError, { method, path });
    throw apiError;
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload, response.status);
    const apiError = new ApiError(message, {
      status: response.status,
      data: payload,
    });
    reportApiFailure(apiError, { method, path });
    throw apiError;
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
  return apiRequest<TResponse>(
    path,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(body),
    },
    config,
  );
};

type AuthRequestConfig = {
  timeout?: number;
  /** Override stored token (e.g. tests); otherwise the saved token is used. */
  token?: string | null;
};

const getAuthHeaders = async (
  init?: RequestInit,
  { token: providedToken }: Pick<AuthRequestConfig, "token"> = {},
) => {
  const token = providedToken ?? (await getSavedAuthToken());

  if (!token) {
    throw new ApiError("Authentication required", { status: 401 });
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return { headers, token };
};

/** Authenticated request: requires a stored (or overridden) token or throws before fetch. */
export const apiRequestWithAuth = async <T>(
  path: string,
  init: RequestInit | undefined = undefined,
  config?: AuthRequestConfig,
) => {
  let requestToken: string | null = null;
  try {
    const auth = await getAuthHeaders(init, config);
    requestToken = auth.token;
    return await apiRequest<T>(
      path,
      { ...init, headers: auth.headers },
      { timeout: config?.timeout },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && requestToken) {
      const failedToken = requestToken;
      await invalidateAuthSession(failedToken, () =>
        deleteSavedAuthTokenIfMatches(failedToken),
      );
    }
    throw error;
  }
};

/** GET request with auth token attached. Use for endpoints that require authentication. */
export const getJsonWithAuth = async <T>(
  path: string,
  init?: RequestInit,
  config?: AuthRequestConfig,
) => {
  return apiRequestWithAuth<T>(path, { ...init, method: "GET" }, config);
};

/** POST request with auth token attached. Use for endpoints that require authentication. */
export const postJsonWithAuth = async <TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  init?: RequestInit,
  config?: AuthRequestConfig,
) => {
  return apiRequestWithAuth<TResponse>(
    path,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(body),
    },
    config,
  );
};

/** DELETE request with auth token attached. */
export const deleteJsonWithAuth = async <T>(
  path: string,
  init?: RequestInit,
  config?: AuthRequestConfig,
) => {
  return apiRequestWithAuth<T>(path, { ...init, method: "DELETE" }, config);
};

/** PATCH request with auth token attached. */
export const patchJsonWithAuth = async <TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  init?: RequestInit,
  config?: AuthRequestConfig,
) => {
  return apiRequestWithAuth<TResponse>(
    path,
    {
      ...init,
      method: "PATCH",
      body: JSON.stringify(body),
    },
    config,
  );
};
