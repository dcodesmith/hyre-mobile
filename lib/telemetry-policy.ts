export type TelemetryErrorDetails = {
  kind: "abort" | "api" | "error" | "unknown";
  shouldReport: boolean;
  status?: number;
  code?: string;
};

export const REQUEST_CANCELLED_CODE = "REQUEST_CANCELLED";

type ApiErrorLike = {
  name: "ApiError";
  status: number;
  code?: unknown;
};

const SAFE_OPERATION_SEGMENTS = new Set([
  "booking-confirmation",
  "payment-status",
  "pricing-preview",
]);

const isApiErrorLike = (error: unknown): error is ApiErrorLike =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "ApiError" &&
  typeof (error as { status?: unknown }).status === "number";

export function getTelemetryErrorDetails(
  error: unknown,
): TelemetryErrorDetails {
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  ) {
    return { kind: "abort", shouldReport: false };
  }

  if (isApiErrorLike(error)) {
    const code = typeof error.code === "string" ? error.code : undefined;
    return {
      kind: "api",
      shouldReport:
        code !== REQUEST_CANCELLED_CODE &&
        (error.status === 0 || error.status === 408 || error.status >= 500),
      status: error.status,
      code,
    };
  }

  if (error instanceof Error) {
    return { kind: "error", shouldReport: true };
  }

  return { kind: "unknown", shouldReport: true };
}

export function getApiEndpointGroup(path: string): string {
  const pathname = path.split("?")[0] ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const group = segments.slice(0, 2);
  if (segments[2] && SAFE_OPERATION_SEGMENTS.has(segments[2])) {
    group.push(segments[2]);
  }
  return group.length > 0 ? `/${group.join("/")}` : "/";
}

export const stripUrlDetails = (value: string): string =>
  value.split(/[?#]/)[0] ?? value;
