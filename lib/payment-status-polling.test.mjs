import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentStatusPollingInterval } from "./payment-status-polling.ts";

test("polls pending and verifying payment states", () => {
  assert.equal(
    getPaymentStatusPollingInterval(
      { lifecycleState: "PENDING" },
      null,
    ),
    3000,
  );
  assert.equal(
    getPaymentStatusPollingInterval(
      { lifecycleState: "VERIFYING" },
      null,
    ),
    3000,
  );
  assert.equal(
    getPaymentStatusPollingInterval(
      { lifecycleState: "CONFIRMED" },
      null,
    ),
    false,
  );
  assert.equal(
    getPaymentStatusPollingInterval(
      { lifecycleState: "PENDING" },
      new Error("offline"),
    ),
    false,
  );
  assert.equal(getPaymentStatusPollingInterval(undefined, null), false);
  assert.equal(
    getPaymentStatusPollingInterval({ lifecycleState: "FAILED" }, null),
    false,
  );
  assert.equal(
    getPaymentStatusPollingInterval({ lifecycleState: "EXPIRED" }, null),
    false,
  );
});
