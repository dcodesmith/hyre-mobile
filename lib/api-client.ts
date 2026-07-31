import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  TRUSTED_REQUEST_ORIGIN,
} from "@/constants/config";
import { deleteSavedAuthToken, getSavedAuthToken } from "@/storage/auth-token";

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
    this.status = status;
    this.data = data;
    this.code = extractErrorCode(data);
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
  error instanceof Error && error.name === "AbortError";

const getNetworkErrorData = (error: unknown) => ({
  code: "NETWORK_ERROR",
  cause: error instanceof Error ? error.message : undefined,
});

export const apiRequest = async <T>(
  path: string,
  init: RequestInit | undefined = undefined,
  { timeout = API_TIMEOUT_MS }: { timeout?: number } = {},
): Promise<T> => {
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
    if (error instanceof ApiError || isAbortError(error)) {
      throw error;
    }

    throw new ApiError("Network request failed", {
      status: 0,
      data: getNetworkErrorData(error),
    });
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const message = extractErrorMessage(payload, response.status);
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

  return headers;
};

/** Authenticated request: requires a stored (or overridden) token or throws before fetch. */
export const apiRequestWithAuth = async <T>(
  path: string,
  init: RequestInit | undefined = undefined,
  config?: AuthRequestConfig,
) => {
  const headers = await getAuthHeaders(init, config);
  try {
    return await apiRequest<T>(
      path,
      { ...init, headers },
      { timeout: config?.timeout },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await deleteSavedAuthToken();
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
