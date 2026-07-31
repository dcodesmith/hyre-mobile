import assert from "node:assert/strict";
import test from "node:test";
import {
  invalidateAuthSession,
  subscribeToAuthSessionInvalidation,
} from "./auth-session-events.ts";

test("clears persisted state before notifying subscribers", async () => {
  const events = [];
  const unsubscribe = subscribeToAuthSessionInvalidation((reason) => {
    events.push(`listener:${reason}`);
  });

  await invalidateAuthSession("unauthorized", () => {
    events.push("storage");
  });

  unsubscribe();
  assert.deepEqual(events, ["storage", "listener:unauthorized"]);
});

test("coalesces concurrent invalidation requests", async () => {
  let releaseClear;
  const clearGate = new Promise((resolve) => {
    releaseClear = resolve;
  });
  let clearCount = 0;
  let listenerCount = 0;
  const unsubscribe = subscribeToAuthSessionInvalidation(() => {
    listenerCount += 1;
  });

  const first = invalidateAuthSession("unauthorized", async () => {
    clearCount += 1;
    await clearGate;
  });
  const second = invalidateAuthSession("unauthorized", () => {
    clearCount += 1;
  });

  assert.equal(first, second);
  releaseClear();
  await first;

  unsubscribe();
  assert.equal(clearCount, 1);
  assert.equal(listenerCount, 1);
});

test("still notifies subscribers when persisted cleanup fails", async () => {
  let notified = false;
  const unsubscribe = subscribeToAuthSessionInvalidation(() => {
    notified = true;
  });

  await invalidateAuthSession("unauthorized", () => {
    throw new Error("storage unavailable");
  });

  unsubscribe();
  assert.equal(notified, true);
});
