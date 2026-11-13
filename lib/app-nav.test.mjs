import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tabBarSource = readFileSync(
  new URL("../components/custom-tab-bar.tsx", import.meta.url),
  "utf8",
);

test("floating nav shows four links for guests and signed-in users", () => {
  assert.match(
    tabBarSource,
    /const GUEST_TAB_ORDER = \["index", "bookings", "referrals", "login"\] as const;/,
  );
  assert.match(
    tabBarSource,
    /const AUTH_TAB_ORDER = \["index", "bookings", "referrals", "profile"\] as const;/,
  );
  assert.match(
    tabBarSource,
    /if \(!isAuthenticated && \(name === "bookings" \|\| name === "referrals"\)\) \{\s*return "login";/,
  );
  assert.doesNotMatch(tabBarSource, /logout/i);
});
