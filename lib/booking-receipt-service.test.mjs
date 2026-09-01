import assert from "node:assert/strict";
import { mock, test } from "node:test";

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
    reportApiFailure: () => undefined,
  },
});
mock.module("@/storage/auth-token", {
  namedExports: {
    deleteSavedAuthTokenIfMatches: async () => undefined,
    getSavedAuthToken: async () => "account-token",
  },
});

const { ApiError } = await import("./api-client.ts");
const {
  fetchBookingReceipt,
  getBookingReceiptErrorMessage,
} = await import("../services/booking-receipt.ts");

const PDF_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);

const pdfResponse = (
  disposition = 'attachment; filename="Tripdly-receipt-BK-001.pdf"',
) =>
  new Response(PDF_BYTES, {
    headers: {
      "Content-Disposition": disposition,
      "Content-Type": "application/pdf",
    },
  });

test("account receipt sends bearer auth without a guest header", async (t) => {
  let request;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    request = { url, init };
    return pdfResponse();
  });

  const receipt = await fetchBookingReceipt("booking/id", { mode: "account" });
  const headers = new Headers(request.init.headers);

  assert.equal(
    request.url,
    "https://example.test/api/bookings/booking%2Fid/receipt",
  );
  assert.equal(headers.get("accept"), "application/pdf");
  assert.equal(headers.get("authorization"), "Bearer account-token");
  assert.equal(headers.has("x-guest-booking-token"), false);
  assert.equal(receipt.fileName, "Tripdly-receipt-BK-001.pdf");
  assert.deepEqual(receipt.bytes, PDF_BYTES);
});

test("guest receipt sends only its scoped header", async (t) => {
  let request;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    request = { url, init };
    return pdfResponse();
  });

  await fetchBookingReceipt("booking-1", {
    mode: "guest",
    token: "g".repeat(43),
  });
  const headers = new Headers(request.init.headers);

  assert.equal(headers.get("x-guest-booking-token"), "g".repeat(43));
  assert.equal(headers.has("authorization"), false);
  assert.equal(request.init.credentials, "omit");
});

test("preserves receipt API errors and retry metadata", async (t) => {
  const responses = [
    new Response(
      JSON.stringify({
        detail: "A payment receipt is not available for this booking.",
        errorCode: "BOOKING_RECEIPT_NOT_AVAILABLE",
      }),
      { status: 409 },
    ),
    new Response(JSON.stringify({ detail: "Too Many Requests" }), {
      status: 429,
      headers: { "Retry-After": "30" },
    }),
    new Response(
      JSON.stringify({
        detail: "Booking not found or you do not have access to it",
        errorCode: "BOOKING_NOT_FOUND",
      }),
      { status: 404 },
    ),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift());

  for (const [status, code, retryAfter] of [
    [409, "BOOKING_RECEIPT_NOT_AVAILABLE", undefined],
    [429, undefined, "30"],
    [404, "BOOKING_NOT_FOUND", undefined],
  ]) {
    await assert.rejects(
      fetchBookingReceipt("booking-1", { mode: "account" }),
      (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, status);
        assert.equal(error.code, code);
        assert.equal(error.retryAfter, retryAfter);
        return true;
      },
    );
  }
});

test("rejects a non-PDF success response", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ unexpected: true }), {
        headers: { "Content-Type": "application/json" },
      }),
  );

  await assert.rejects(
    fetchBookingReceipt("booking-1", { mode: "account" }),
    (error) => error instanceof ApiError && error.status === 502,
  );
});

test("uses a safe fallback when disposition is not an attachment", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    pdfResponse('inline; filename="ignored.pdf"'),
  );

  const receipt = await fetchBookingReceipt("booking-1", { mode: "account" });

  assert.equal(receipt.fileName, "Tripdly-receipt.pdf");
});

test("maps receipt-specific feedback", () => {
  assert.equal(
    getBookingReceiptErrorMessage(
      new ApiError("Too Many Requests", {
        status: 429,
        retryAfter: "30",
      }),
    ),
    "Too many receipt requests. Try again in 30 seconds.",
  );
  assert.equal(
    getBookingReceiptErrorMessage(
      new ApiError("internal renderer detail", { status: 500 }),
    ),
    "The receipt could not be downloaded. Please try again.",
  );
});
