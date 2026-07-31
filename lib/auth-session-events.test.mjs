import assert from "node:assert/strict";
import test from "node:test";
import {
  invalidateAuthSession,
  setAuthSessionInvalidationHandler,
} from "./auth-session-events.ts";

test("clears persisted state before notifying the handler", async () => {
  const events = [];
  const clearHandler = setAuthSessionInvalidationHandler((failedToken) => {
    events.push(`handler:${failedToken}`);
  });

  await invalidateAuthSession("expired-token", () => {
    events.push("storage");
    return true;
  });

  clearHandler();
  assert.deepEqual(events, ["storage", "handler:expired-token"]);
});

test("ignores an invalidation when the persisted session has changed", async () => {
  let handled = false;
  const clearHandler = setAuthSessionInvalidationHandler(() => {
    handled = true;
  });

  await invalidateAuthSession("old-token", () => false);

  clearHandler();
  assert.equal(handled, false);
});

test("still notifies the handler when persisted cleanup fails", async () => {
  let handled = false;
  const clearHandler = setAuthSessionInvalidationHandler(() => {
    handled = true;
  });

  await invalidateAuthSession("expired-token", () => {
    throw new Error("storage unavailable");
  });

  clearHandler();
  assert.equal(handled, true);
});
