import assert from "node:assert/strict";
import test from "node:test";
import {
  getNotificationResponseDisposition,
  getPushTokensToRevoke,
  markPushRegistrationPendingRevocation,
  markPushRegistrationSucceeded,
  markStalePushTokenRevoked,
  parsePushRegistrationState,
  stagePushRegistration,
} from "./push-notification-lifecycle.ts";

const registeredState = {
  version: 1,
  token: "ExponentPushToken[current]",
  platform: "ios",
  ownerUserId: "user-1",
  status: "registered",
  staleTokens: [],
};

test("stages and completes an initial registration", () => {
  const pending = stagePushRegistration(null, {
    token: "ExponentPushToken[current]",
    platform: "ios",
    userId: "user-1",
  });

  assert.equal(pending.status, "pending-registration");
  assert.equal(pending.ownerUserId, "user-1");
  assert.deepEqual(
    markPushRegistrationSucceeded(pending, "user-1"),
    registeredState,
  );
});

test("stages token rotation before revoking the previous token", () => {
  const pending = stagePushRegistration(registeredState, {
    token: "ExponentPushToken[rotated]",
    platform: "ios",
    userId: "user-1",
  });

  assert.equal(pending.token, "ExponentPushToken[rotated]");
  assert.deepEqual(pending.staleTokens, ["ExponentPushToken[current]"]);

  const registered = markPushRegistrationSucceeded(pending, "user-1");
  assert.deepEqual(getPushTokensToRevoke(registered), [
    "ExponentPushToken[rotated]",
    "ExponentPushToken[current]",
  ]);
  assert.deepEqual(
    markStalePushTokenRevoked(registered, "ExponentPushToken[current]")
      .staleTokens,
    [],
  );
});

test("restages a failed logout token for a new account", () => {
  const pendingRevocation =
    markPushRegistrationPendingRevocation(registeredState);
  const pendingTransfer = stagePushRegistration(pendingRevocation, {
    token: pendingRevocation.token,
    platform: "ios",
    userId: "user-2",
  });

  assert.equal(pendingTransfer.status, "pending-registration");
  assert.equal(pendingTransfer.ownerUserId, "user-2");
  assert.deepEqual(pendingTransfer.staleTokens, []);

  const transferred = markPushRegistrationSucceeded(
    pendingTransfer,
    "user-2",
  );
  assert.equal(transferred.status, "registered");
  assert.equal(transferred.ownerUserId, "user-2");
});

test("parses only valid versioned registration state", () => {
  assert.deepEqual(parsePushRegistrationState(registeredState), registeredState);
  assert.equal(
    parsePushRegistrationState({ ...registeredState, version: 2 }),
    null,
  );
  assert.equal(
    parsePushRegistrationState({ ...registeredState, staleTokens: [42] }),
    null,
  );
});

test("queues notification responses until hydration and authentication complete", () => {
  assert.equal(
    getNotificationResponseDisposition({
      isAuthenticated: true,
      isHydrating: true,
    }),
    "queue",
  );
  assert.equal(
    getNotificationResponseDisposition({
      isAuthenticated: false,
      isHydrating: false,
    }),
    "queue",
  );
  assert.equal(
    getNotificationResponseDisposition({
      isAuthenticated: true,
      isHydrating: false,
    }),
    "handle",
  );
});
