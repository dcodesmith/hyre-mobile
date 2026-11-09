import assert from "node:assert/strict";
import { mock, test } from "node:test";

mock.module("@/constants/config", {
  namedExports: {
    API_BASE_URL: "https://example.test",
    API_TIMEOUT_MS: 1_000,
    TRUSTED_REQUEST_ORIGIN: "https://example.test",
    API_ENDPOINTS: {
      requestOtp: "/api/auth/email-otp/send-verification-otp",
      verifyOtp: "/api/auth/sign-in/email-otp",
      session: "/auth/session",
      logout: "/api/auth/sign-out",
      currentUser: "/api/users/me",
      phoneVerifications: "/api/users/me/phone-verifications",
      phoneVerificationChecks: "/api/users/me/phone-verification-checks",
      guestPhoneVerifications: "/api/bookings/guest-phone-verifications",
      guestPhoneVerificationChecks:
        "/api/bookings/guest-phone-verification-checks",
      pushTokens: "/api/users/me/push-tokens",
      referralsUser: "/api/referrals/user",
    },
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
    getSavedAuthToken: async () => "stored-token",
  },
});

const {
  checkPhoneVerification,
  checkGuestPhoneVerification,
  fetchCurrentUser,
  requestGuestPhoneVerification,
  requestPhoneVerification,
  updateCurrentUser,
  verifyOtp,
} = await import("../services/auth.ts");

const SESSION_USER = {
  id: "user-1",
  email: "user@example.com",
  name: "Session Name",
  roles: ["user"],
};

const PROFILE = {
  name: "Ada Lovelace",
  phoneNumber: "+2348012345678",
  city: null,
  address: null,
  marketingConsent: false,
  phoneVerified: true,
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function installFetch(t, handler) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const request = {
      url: String(url),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: init?.body,
    };
    requests.push(request);
    return handler(request);
  });
  return requests;
}

function pathname(url) {
  return new URL(url).pathname;
}

test("posts phone verification send and check contracts", async (t) => {
  const requests = installFetch(t, (request) => {
    if (pathname(request.url).endsWith("/phone-verifications")) {
      return jsonResponse({
        status: "PENDING",
        phoneNumber: "+234******5678",
      });
    }
    return jsonResponse({
      status: "VERIFIED",
      phoneNumber: "+2348012345678",
    });
  });

  const pending = await requestPhoneVerification("+2348012345678");
  const verified = await checkPhoneVerification("+2348012345678", "123456");

  assert.deepEqual(pending, {
    status: "PENDING",
    phoneNumber: "+234******5678",
  });
  assert.equal(verified.status, "VERIFIED");
  assert.equal(requests.length, 2);

  assert.equal(
    pathname(requests[0].url),
    "/api/users/me/phone-verifications",
  );
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].headers.get("authorization"), "Bearer stored-token");
  assert.deepEqual(JSON.parse(requests[0].body), {
    phoneNumber: "+2348012345678",
  });

  assert.equal(
    pathname(requests[1].url),
    "/api/users/me/phone-verification-checks",
  );
  assert.equal(requests[1].method, "POST");
  assert.equal(requests[1].headers.get("authorization"), "Bearer stored-token");
  assert.deepEqual(JSON.parse(requests[1].body), {
    phoneNumber: "+2348012345678",
    code: "123456",
  });
});

test("patches editable profile fields through the current-user endpoint", async (t) => {
  const requests = installFetch(t, () => jsonResponse(PROFILE));
  const payload = {
    name: "Ada Lovelace",
    city: "Lagos",
    address: "4 Alh Mudashiru Eletu Way",
    marketingConsent: true,
  };

  const profile = await updateCurrentUser(payload);

  assert.deepEqual(profile, PROFILE);
  assert.equal(requests.length, 1);
  assert.equal(pathname(requests[0].url), "/api/users/me");
  assert.equal(requests[0].method, "PATCH");
  assert.equal(requests[0].headers.get("authorization"), "Bearer stored-token");
  assert.deepEqual(JSON.parse(requests[0].body), payload);
});

test("posts guest verification without authentication and returns the proof", async (t) => {
  const requests = installFetch(t, (request) =>
    jsonResponse(
      pathname(request.url).endsWith("/guest-phone-verifications")
        ? { status: "PENDING", phoneNumber: "+234******5678" }
        : {
            status: "VERIFIED",
            phoneNumber: "+234******5678",
            verificationToken: "phone-proof",
          },
    ),
  );

  await requestGuestPhoneVerification("+2348012345678");
  const verified = await checkGuestPhoneVerification(
    "+2348012345678",
    "123456",
  );

  assert.equal(verified.verificationToken, "phone-proof");
  assert.deepEqual(
    requests.map((request) => pathname(request.url)),
    [
      "/api/bookings/guest-phone-verifications",
      "/api/bookings/guest-phone-verification-checks",
    ],
  );
  assert.equal(requests[0].headers.get("authorization"), null);
  assert.equal(requests[1].headers.get("authorization"), null);
});

test("verifyOtp fetches the current profile once with the new token", async (t) => {
  const requests = installFetch(t, (request) => {
    const path = pathname(request.url);
    if (path === "/api/auth/sign-in/email-otp") {
      return jsonResponse({
        token: "otp-token",
        user: { id: "stale-user", email: "stale@example.com" },
      });
    }
    if (path === "/auth/session") {
      return jsonResponse({
        user: SESSION_USER,
        session: {
          id: "session-1",
          userId: SESSION_USER.id,
          expiresAt: "2026-10-02T00:00:00.000Z",
        },
      });
    }
    if (path === "/api/users/me") {
      return jsonResponse(PROFILE);
    }
    return jsonResponse({ message: "unexpected" }, 500);
  });

  const session = await verifyOtp({
    email: "user@example.com",
    otpCode: "123456",
  });

  assert.equal(session.token, "otp-token");
  assert.equal(session.user.id, "user-1");
  assert.equal(session.user.email, "user@example.com");
  assert.deepEqual(session.user.roles, ["user"]);
  assert.equal(session.user.name, "Ada Lovelace");
  assert.equal(session.user.phoneNumber, "+2348012345678");
  assert.equal(session.user.phoneVerified, true);

  const paths = requests.map((request) => pathname(request.url));
  assert.equal(paths[0], "/api/auth/sign-in/email-otp");
  assert.deepEqual(paths.slice(1).sort(), ["/api/users/me", "/auth/session"]);
  assert.equal(paths.filter((path) => path === "/api/users/me").length, 1);
  assert.deepEqual(JSON.parse(requests[0].body), {
    email: "user@example.com",
    otp: "123456",
    role: "user",
  });
  assert.equal(requests[0].headers.has("authorization"), false);
  for (const path of ["/auth/session", "/api/users/me"]) {
    const request = requests.find((item) => pathname(item.url) === path);
    assert.equal(request.headers.get("authorization"), "Bearer otp-token");
  }
});

test("verifyOtp does not fetch a profile without an access token", async (t) => {
  const requests = installFetch(t, () => jsonResponse({ success: true }));

  await assert.rejects(
    verifyOtp({ email: "user@example.com", otpCode: "123456" }),
    /valid access token/,
  );
  assert.deepEqual(
    requests.map((request) => pathname(request.url)),
    ["/api/auth/sign-in/email-otp"],
  );
});

test("current profile requires a boolean phoneVerified flag", async (t) => {
  const profileResponses = [
    PROFILE,
    { ...PROFILE, phoneVerified: false },
    { ...PROFILE, phoneVerified: undefined },
    { ...PROFILE, phoneVerified: "true" },
  ];
  installFetch(t, (request) => {
    const path = pathname(request.url);
    if (path === "/auth/session") {
      return jsonResponse({
        user: SESSION_USER,
        session: {
          id: "session-1",
          userId: SESSION_USER.id,
          expiresAt: "2026-10-02T00:00:00.000Z",
        },
      });
    }
    const profile = profileResponses.shift();
    const body = { ...profile };
    if (body.phoneVerified === undefined) delete body.phoneVerified;
    return jsonResponse(body);
  });

  const verified = await fetchCurrentUser("otp-token");
  assert.equal(verified.phoneVerified, true);
  const unverified = await fetchCurrentUser("otp-token");
  assert.equal(unverified.phoneVerified, false);

  await assert.rejects(
    fetchCurrentUser("otp-token"),
    /phone verification status/,
  );
  await assert.rejects(
    fetchCurrentUser("otp-token"),
    /phone verification status/,
  );
});
