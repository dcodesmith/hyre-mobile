import assert from "node:assert/strict";
import test from "node:test";
import { getBookingActionVisibility } from "./booking-action-policy.ts";

test("getBookingActionVisibility covers independent canEdit/canCancel combinations", () => {
  assert.deepEqual(
    getBookingActionVisibility({ canEdit: false, canCancel: false }),
    { showEdit: false, showCancel: false, showActions: false },
  );
  assert.deepEqual(
    getBookingActionVisibility({ canEdit: false, canCancel: true }),
    { showEdit: false, showCancel: true, showActions: true },
  );
  assert.deepEqual(
    getBookingActionVisibility({ canEdit: true, canCancel: false }),
    { showEdit: true, showCancel: false, showActions: true },
  );
  assert.deepEqual(
    getBookingActionVisibility({ canEdit: true, canCancel: true }),
    { showEdit: true, showCancel: true, showActions: true },
  );
});

test("getBookingActionVisibility does not treat truthy non-booleans as allowed", () => {
  assert.deepEqual(
    getBookingActionVisibility({
      canEdit: /** @type {any} */ ("yes"),
      canCancel: /** @type {any} */ (1),
    }),
    { showEdit: false, showCancel: false, showActions: false },
  );
});
