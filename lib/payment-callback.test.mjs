import assert from "node:assert/strict";
import test from "node:test";
import { parsePaymentCallback } from "./payment-callback.ts";

test("parses a Flutterwave payment callback", () => {
  assert.deepEqual(
    parsePaymentCallback(
      "hyre://payment-status?status=successful&tx_ref=tx-1&transaction_id=123",
    ),
    {
      txRef: "tx-1",
      status: "successful",
      transactionId: "123",
    },
  );
  assert.equal(parsePaymentCallback("hyre://payment-status?status=cancelled"), null);
});
