import assert from "node:assert/strict";
import test from "node:test";
import { getExtensionPaymentLifecycleState } from "./extension-payment-status.ts";

const payment = (status, extensionStatus) => ({
  txRef: "ext-1",
  status,
  amountExpected: 25_000,
  amountCharged: null,
  confirmedAt: null,
  extension: { id: "extension-1", status: extensionStatus },
});

test("maps extension payment states to the shared payment lifecycle", () => {
  assert.equal(
    getExtensionPaymentLifecycleState(payment("SUCCESSFUL", "ACTIVE")),
    "CONFIRMED",
  );
  assert.equal(
    getExtensionPaymentLifecycleState(payment("PENDING", "PENDING")),
    "PENDING",
  );
  assert.equal(
    getExtensionPaymentLifecycleState(payment("PENDING", "CANCELLED")),
    "EXPIRED",
  );
  assert.equal(
    getExtensionPaymentLifecycleState(payment("FAILED", "PENDING")),
    "FAILED",
  );
});
