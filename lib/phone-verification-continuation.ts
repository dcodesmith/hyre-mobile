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

export function shouldAutoFinishPhoneVerification(input: {
  phoneVerified: boolean | undefined;
  reason: unknown;
}): boolean {
  return (
    input.phoneVerified === true && firstString(input.reason) !== "booking"
  );
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

/** Route-based login continues; booking enforces phone verification inline. */
export function postLoginContinuation(input: {
  resumePrevious: boolean;
  redirectTo?: string;
}): { method: "replace"; href: SafeContinuationHref } | null {
  if (input.resumePrevious) return null;
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
