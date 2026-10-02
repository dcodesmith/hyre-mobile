import assert from "node:assert/strict";
import test from "node:test";
import {
  requireAuthenticatedUser,
  resolveAuthenticatedSession,
} from "./auth-session.ts";

test("requireAuthenticatedUser accepts a session profile", () => {
  const user = {
    id: "user-1",
    email: "user@example.com",
    name: null,
    roles: ["user"],
  };

  assert.equal(requireAuthenticatedUser(user), user);
});

test("requireAuthenticatedUser rejects an incomplete session profile", () => {
  for (const user of [
    null,
    {},
    { email: "user@example.com" },
    { id: "" },
    { id: "user-1", email: "" },
  ]) {
    assert.throws(() => requireAuthenticatedUser(user), /valid user profile/);
  }
});

test("uses the OTP user when it is complete", async () => {
  const user = { id: "user-1", email: "user@example.com", roles: ["user"] };
  let fetchCount = 0;

  const session = await resolveAuthenticatedSession(
    { token: "token-1", user },
    async () => {
      fetchCount += 1;
      return user;
    },
  );

  assert.deepEqual(session, { token: "token-1", user });
  assert.equal(fetchCount, 0);
});

test("fetches the canonical user when the OTP response omits it", async () => {
  const user = { id: "user-1", email: "user@example.com" };

  const session = await resolveAuthenticatedSession(
    { token: "token-1" },
    async (token) => {
      assert.equal(token, "token-1");
      return user;
    },
  );

  assert.deepEqual(session, { token: "token-1", user });
});

test("rejects an incomplete user from both auth responses", async () => {
  await assert.rejects(
    resolveAuthenticatedSession(
      { token: "token-1", user: { email: "user@example.com" } },
      async () => ({ email: "user@example.com" }),
    ),
    /valid user profile/,
  );
});
