import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import { API_BASE_URL } from "@/constants/config";
import {
  getApiEndpointGroup,
  getTelemetryErrorDetails,
  stripUrlDetails,
} from "@/lib/telemetry-policy";

export type TelemetryArea =
  | "api"
  | "auth"
  | "booking_checkout"
  | "booking_pricing"
  | "payment"
  | "route";

type TelemetryContext = {
  area: TelemetryArea;
  operation: string;
};

type BookingCheckoutOperation =
  | "create_booking"
  | "open_flutterwave_checkout";
type BookingCheckoutState =
  | "started"
  | "succeeded"
  | "cancelled"
  | "failed";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const telemetryEnabled = Boolean(sentryDsn) && !__DEV__;
const appEnvironment =
  process.env.EXPO_PUBLIC_APP_ENV?.trim() ||
  (__DEV__ ? "development" : "production");
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
  ignoreEmptyBackNavigationTransactions: true,
});
const API_FAILURE_COOLDOWN_MS = 30_000;
const apiFailureReportedAt = new Map<string, number>();

export function initializeTelemetry(): void {
  Sentry.init({
    dsn: sentryDsn || undefined,
    enabled: telemetryEnabled,
    environment: appEnvironment,
    sendDefaultPii: false,
    maxBreadcrumbs: 50,
    tracesSampleRate: appEnvironment === "production" ? 0.1 : 1,
    tracePropagationTargets: [API_BASE_URL],
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "console") return null;
      const data = breadcrumb.data;
      if (!data) return breadcrumb;
      for (const key of ["url", "from", "to"]) {
        const value = data[key];
        if (typeof value === "string") {
          data[key] = stripUrlDetails(value);
        }
      }
      return breadcrumb;
    },
    beforeSend(event) {
      event.user = undefined;
      if (event.request) {
        event.request = {
          method: event.request.method,
          url: event.request.url
            ? stripUrlDetails(event.request.url)
            : undefined,
        };
      }
      return event;
    },
  });
}

export function registerTelemetryNavigationContainer(
  navigationContainerRef: unknown,
): void {
  if (!telemetryEnabled) return;
  navigationIntegration.registerNavigationContainer(navigationContainerRef);
}

const configureScope = (
  scope: Sentry.Scope,
  context: TelemetryContext,
): void => {
  scope.setTag("area", context.area);
  scope.setTag("operation", context.operation);
};

const normalizeThrownValue = (error: unknown): Error =>
  error instanceof Error ? error : new Error("Non-error value thrown");

export function reportRouteError(error: unknown): string | undefined {
  if (!telemetryEnabled) return undefined;

  return Sentry.withScope((scope) => {
    configureScope(scope, { area: "route", operation: "render" });
    scope.setLevel("error");
    return Sentry.captureException(normalizeThrownValue(error));
  });
}

export function reportHandledException(
  error: unknown,
  context: TelemetryContext,
): string | undefined {
  if (!telemetryEnabled) return undefined;

  const details = getTelemetryErrorDetails(error);
  if (!details.shouldReport || details.kind === "api") return undefined;

  return Sentry.withScope((scope) => {
    configureScope(scope, context);
    scope.setTag("error_kind", details.kind);
    return Sentry.captureException(normalizeThrownValue(error));
  });
}

export function recordBookingCheckoutStep(
  operation: BookingCheckoutOperation,
  state: BookingCheckoutState,
  data?: Record<string, string | number | boolean>,
): void {
  if (!telemetryEnabled) return;

  Sentry.addBreadcrumb({
    category: `booking_checkout.${operation}`,
    message: state,
    level: state === "failed" ? "error" : "info",
    data,
  });
}

export function reportApiFailure(
  error: unknown,
  request: { method: string; path: string },
): string | undefined {
  if (!telemetryEnabled) return undefined;

  const details = getTelemetryErrorDetails(error);
  if (!details.shouldReport || details.kind !== "api") return undefined;

  const endpoint = getApiEndpointGroup(request.path);
  const failureParts = [
    request.method,
    endpoint,
    String(details.status),
    details.code ?? "unknown",
  ];
  const failureKey = failureParts.join(":");
  const now = Date.now();
  const lastReportedAt = apiFailureReportedAt.get(failureKey);
  if (
    lastReportedAt !== undefined &&
    now - lastReportedAt < API_FAILURE_COOLDOWN_MS
  ) {
    return undefined;
  }
  apiFailureReportedAt.set(failureKey, now);

  return Sentry.withScope((scope) => {
    configureScope(scope, { area: "api", operation: "request" });
    scope.setTag("http_method", request.method);
    scope.setTag("endpoint_group", endpoint);
    scope.setTag("status", String(details.status));
    if (details.code) scope.setTag("error_code", details.code);
    scope.setFingerprint(["api-failure", ...failureParts]);
    return Sentry.captureException(new Error("API request failed"));
  });
}

export function reportUnexpectedState(
  message: string,
  context: TelemetryContext,
): string | undefined {
  if (!telemetryEnabled) return undefined;

  return Sentry.withScope((scope) => {
    configureScope(scope, context);
    scope.setLevel("warning");
    return Sentry.captureMessage(message);
  });
}
