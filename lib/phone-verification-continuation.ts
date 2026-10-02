import {
  pickRedirectToParam,
  resolvePostLoginHref,
} from "./sign-in-redirect";

export const PHONE_VERIFICATION_PATHNAME = "/phone-verification" as const;

export type PhoneVerificationContinuation = {
  redirectTo?: string;
  resumePrevious: boolean;
};

export type SafeContinuationHref = ReturnType<typeof resolvePostLoginHref>;

function firstString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (
    Array.isArray(value) &&
    typeof value[0] === "string" &&
    value[0].length > 0
  ) {
    return value[0];
  }
  return undefined;
}

export function readPhoneVerificationContinuation(params: {
  redirectTo?: unknown;
  resumePrevious?: unknown;
}): PhoneVerificationContinuation {
  return {
    redirectTo: pickRedirectToParam(params.redirectTo),
    resumePrevious: firstString(params.resumePrevious) === "true",
  };
}

export function phoneVerificationRouteParams(continuation: {
  redirectTo?: string;
  resumePrevious?: boolean;
}): { redirectTo?: string; resumePrevious?: "true" } {
  return {
    ...(continuation.redirectTo ? { redirectTo: continuation.redirectTo } : {}),
    ...(continuation.resumePrevious ? { resumePrevious: "true" as const } : {}),
  };
}

export function phoneVerificationRouteDecision(input: {
  pathname: string;
  isAlreadyRouting: boolean;
  continuation: { redirectTo?: string; resumePrevious?: boolean };
}): {
  method: "push" | "replace";
  pathname: typeof PHONE_VERIFICATION_PATHNAME;
  params: { redirectTo?: string; resumePrevious?: "true" };
} | null {
  if (
    input.pathname === PHONE_VERIFICATION_PATHNAME ||
    input.isAlreadyRouting
  ) {
    return null;
  }

  return {
    method: input.continuation.resumePrevious ? "push" : "replace",
    pathname: PHONE_VERIFICATION_PATHNAME,
    params: phoneVerificationRouteParams(input.continuation),
  };
}

export function shouldRequirePhoneVerification(input: {
  isHydrating: boolean;
  hasAuthToken: boolean;
  phoneVerified: boolean | undefined;
}): boolean {
  return (
    !input.isHydrating && input.hasAuthToken && input.phoneVerified === false
  );
}

/** Signed-in users with a verified phone leave login. Phone setup defers that. */
export function postLoginContinuation(input: {
  phoneVerified: boolean;
  resumePrevious: boolean;
  redirectTo?: string;
}): { method: "replace"; href: SafeContinuationHref } | null {
  if (!input.phoneVerified || input.resumePrevious) return null;
  return { method: "replace", href: resolvePostLoginHref(input.redirectTo) };
}

export function completedPhoneVerificationContinuation(input: {
  resumePrevious: boolean;
  canGoBack: boolean;
  redirectTo?: string;
}): { method: "back" } | { method: "replace"; href: SafeContinuationHref } {
  if (input.resumePrevious && input.canGoBack) return { method: "back" };
  return { method: "replace", href: resolvePostLoginHref(input.redirectTo) };
}

export function normalizePhoneOtpInput(value: string, maxLength = 10): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}
