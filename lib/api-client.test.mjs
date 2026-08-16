import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  getTelemetryErrorDetails,
  REQUEST_CANCELLED_CODE,
} from "./telemetry-policy.ts";

const reportedFailures = [];

mock.module("@/constants/config", {
  namedExports: {
    API_BASE_URL: "https://example.test",
    API_TIMEOUT_MS: 1_000,
    TRUSTED_REQUEST_ORIGIN: "https://example.test",
  },
});
mock.module("@/lib/auth-session-events", {
  namedExports: {
    invalidateAuthSession: async () => undefined,
  },
});
mock.module("@/lib/telemetry", {
  namedExports: {
    reportApiFailure: (error, request) => {
      reportedFailures.push({ error, request });
    },
  },
});
mock.module("@/storage/auth-token", {
  namedExports: {
    deleteSavedAuthTokenIfMatches: async () => undefined,
    getSavedAuthToken: async () => null,
  },
});

const { ApiError, apiRequest } = await import("./api-client.ts");

const assertCancellation = (error) => {
  assert.ok(error instanceof ApiError);
  assert.equal(error.name, "ApiError");
  assert.equal(error.status, 0);
  assert.equal(error.code, REQUEST_CANCELLED_CODE);
  assert.equal(getTelemetryErrorDetails(error).shouldReport, false);
  return true;
};

test("classifies an abort while fetch is pending as cancellation", async (t) => {
  reportedFailures.length = 0;
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", (_url, init) => {
    return new Promise((_, reject) => {
      init.signal.addEventListener(
        "abort",
        () => reject(new Error("native fetch aborted")),
        { once: true },
      );
    });
  });

  const request = apiRequest("/api/test", { signal: controller.signal });
  controller.abort();

  await assert.rejects(request, assertCancellation);
  assert.equal(reportedFailures.length, 0);
});

test("clears the timeout when cancellation wins", async (t) => {
  reportedFailures.length = 0;
  const controller = new AbortController();
  const requestTimeout = 5_000;
  const requestTimer = Symbol("request timer");
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let clearedRequestTimers = 0;

  t.mock.method(globalThis, "fetch", () => new Promise(() => undefined));
  t.mock.method(globalThis, "setTimeout", (callback, delay, ...args) => {
    if (delay === requestTimeout) return requestTimer;
    return realSetTimeout(callback, delay, ...args);
  });
  t.mock.method(globalThis, "clearTimeout", (timer) => {
    if (timer === requestTimer) {
      clearedRequestTimers += 1;
      return;
    }
    realClearTimeout(timer);
  });

  const request = apiRequest(
    "/api/test",
    { signal: controller.signal },
    { timeout: requestTimeout },
  );
  controller.abort();

  await assert.rejects(request, assertCancellation);
  assert.equal(clearedRequestTimers, 1);
  assert.equal(reportedFailures.length, 0);
});

test("classifies an abort while reading the response as cancellation", async (t) => {
  reportedFailures.length = 0;
  const controller = new AbortController();
  let bodyStarted;
  const bodyIsStarted = new Promise((resolve) => {
    bodyStarted = resolve;
  });

  t.mock.method(globalThis, "fetch", async (_url, init) => ({
    ok: true,
    status: 200,
    text: () => {
      bodyStarted();
      return new Promise((_, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(new Error("native body read aborted")),
          { once: true },
        );
      });
    },
  }));

  const request = apiRequest("/api/test", { signal: controller.signal });
  await bodyIsStarted;
  controller.abort();

  await assert.rejects(request, assertCancellation);
  assert.equal(reportedFailures.length, 0);
});

test("preserves a timeout that settles before cancellation", async (t) => {
  reportedFailures.length = 0;
  const controller = new AbortController();
  const requestTimeout = 1;
  const realSetTimeout = globalThis.setTimeout;
  let interceptedRequestTimeout = false;
  t.mock.method(globalThis, "fetch", () => new Promise(() => undefined));
  t.mock.method(globalThis, "setTimeout", (callback, delay, ...args) => {
    if (delay !== requestTimeout || interceptedRequestTimeout) {
      return realSetTimeout(callback, delay, ...args);
    }
    interceptedRequestTimeout = true;
    return realSetTimeout(() => {
      callback(...args);
      controller.abort();
    }, 0);
  });

  const request = apiRequest(
    "/api/test",
    { signal: controller.signal },
    { timeout: requestTimeout },
  );

  await assert.rejects(request, (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 408);
    assert.equal(error.code, undefined);
    assert.equal(getTelemetryErrorDetails(error).shouldReport, true);
    return true;
  });
  assert.equal(reportedFailures.length, 1);
});

test("preserves a body failure that settles before cancellation", async (t) => {
  reportedFailures.length = 0;
  const controller = new AbortController();
  let bodyStarted;
  let rejectBody;
  const bodyIsStarted = new Promise((resolve) => {
    bodyStarted = resolve;
  });
  const body = new Promise((_, reject) => {
    rejectBody = reject;
  });

  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    status: 200,
    text: () => {
      bodyStarted();
      return body;
    },
  }));

  const request = apiRequest("/api/test", { signal: controller.signal });
  await bodyIsStarted;
  rejectBody(new Error("response body failed"));
  controller.abort();

  await assert.rejects(request, (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, "Failed to read response");
    assert.equal(error.status, 0);
    assert.equal(error.code, "NETWORK_ERROR");
    assert.equal(getTelemetryErrorDetails(error).shouldReport, true);
    return true;
  });
  assert.equal(reportedFailures.length, 1);
});
