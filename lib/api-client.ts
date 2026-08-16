import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  TRUSTED_REQUEST_ORIGIN,
} from "@/constants/config";
import { invalidateAuthSession } from "@/lib/auth-session-events";
import { reportApiFailure } from "@/lib/telemetry";
import { REQUEST_CANCELLED_CODE } from "@/lib/telemetry-policy";
import {
  deleteSavedAuthTokenIfMatches,
  getSavedAuthToken,
} from "@/storage/auth-token";

export { REQUEST_CANCELLED_CODE } from "@/lib/telemetry-policy";

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

const withTimeout = <T>(
  promise: Promise<T>,
  timeout: number,
  signal?: AbortSignal,
): Promise<T> => {
  if (!timeout) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new ApiError("Request timed out", { status: 408 }));
    }, timeout);
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      reject(signal?.reason);
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) {
      handleAbort();
    }

    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
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

const isRequestCancelledError = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === REQUEST_CANCELLED_CODE;

type RequestCancellation = {
  signal: AbortSignal | undefined;
  race<T>(promise: Promise<T>): Promise<T>;
  dispose(): void;
};

const createRequestCancellation = (
  signal: AbortSignal | undefined,
): RequestCancellation => {
  if (!signal) {
    return {
      signal: undefined,
      race: <T>(promise: Promise<T>) => promise,
      dispose: () => undefined,
    };
  }

  const controller = new AbortController();
  let rejectCancellation: (error: ApiError) => void = () => undefined;
  const cancellationPromise = new Promise<never>((_, reject) => {
    rejectCancellation = reject;
  });
  const cancel = () => {
    const error = createRequestCancelledError(signal.reason);
    rejectCancellation(error);
    controller.abort(error);
  };

  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) {
    cancel();
  }

  return {
    signal: controller.signal,
    race: <T>(promise: Promise<T>) =>
      Promise.race([promise, cancellationPromise]),
    dispose: () => signal.removeEventListener("abort", cancel),
  };
};

const parseResponseBody = async (
  response: Response,
  cancellation: RequestCancellation,
) => {
  const text = await cancellation.race(response.text());

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getNetworkErrorData = (error: unknown) => ({
  code: "NETWORK_ERROR",
  cause: error instanceof Error ? error.message : undefined,
});

type ApiRequestDetails = {
  method: string;
  path: string;
};

const getCancellationError = (error: unknown): ApiError | undefined => {
  if (isRequestCancelledError(error)) return error;
  if (isAbortError(error)) return createRequestCancelledError(error);
  return undefined;
};

const getRequestError = (
  error: unknown,
  request: ApiRequestDetails,
): ApiError => {
  const cancellationError = getCancellationError(error);
  if (cancellationError) return cancellationError;

  if (error instanceof ApiError) {
    reportApiFailure(error, request);
    return error;
  }

  const networkError = new ApiError("Network request failed", {
    status: 0,
    data: getNetworkErrorData(error),
  });
  reportApiFailure(networkError, request);
  return networkError;
};

const getResponseBodyError = (
  error: unknown,
  response: Response,
  request: ApiRequestDetails,
): ApiError => {
  const cancellationError = getCancellationError(error);
  if (cancellationError) return cancellationError;

  const apiError = new ApiError("Failed to read response", {
    status: response.ok ? 0 : response.status,
    data: getNetworkErrorData(error),
  });
  reportApiFailure(apiError, request);
  return apiError;
};

export const apiRequest = async <T>(
  path: string,
  init: RequestInit | undefined = undefined,
  { timeout = API_TIMEOUT_MS }: { timeout?: number } = {},
): Promise<T> => {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  const cancellation = createRequestCancellation(init?.signal ?? undefined);
  headers.set("Accept", "application/json");
  headers.set("X-Client-Type", "mobile");
  if (!headers.has("Origin")) {
    headers.set("Origin", TRUSTED_REQUEST_ORIGIN);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    let response: Response;
    try {
      response = await cancellation.race(
        withTimeout(
          fetch(buildUrl(path), {
            ...init,
            headers,
            signal: cancellation.signal,
          }),
          timeout,
          cancellation.signal,
        ),
      );
    } catch (error) {
      throw getRequestError(error, { method, path });
    }

    let payload: unknown;
    try {
      payload = await parseResponseBody(response, cancellation);
    } catch (error) {
      throw getResponseBodyError(error, response, { method, path });
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
  } finally {
    cancellation.dispose();
  }
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
