import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const referralsSource = readFileSync(
  new URL("../app/(tabs)/referrals.tsx", import.meta.url),
  "utf8",
);
const configSource = readFileSync(
  new URL("../constants/config.ts", import.meta.url),
  "utf8",
);
const profileSource = readFileSync(
  new URL("../app/(tabs)/profile.tsx", import.meta.url),
  "utf8",
);
const detailCardSource = readFileSync(
  new URL("../components/booking-detail-card.tsx", import.meta.url),
  "utf8",
);

test("referral sections reuse the profile card shell", () => {
  for (const component of [
    "DetailCard",
    "DetailCardHeader",
    "DetailCardTitle",
    "DetailCardBody",
  ]) {
    assert.match(profileSource, new RegExp(`<${component}>`));
    assert.match(referralsSource, new RegExp(`<${component}>`));
  }

  assert.equal(referralsSource.split("<DetailCard>").length - 1, 2);
  assert.match(
    detailCardSource,
    /overflow-hidden rounded border border-gray-200 bg-white/,
  );
  assert.match(
    detailCardSource,
    /border-b border-gray-200 bg-gray-50 p-4/,
  );
});

test("referral stat cards have no shadow", () => {
  const statCardSource = referralsSource.match(
    /function StatCard[\s\S]*?export default/,
  )?.[0];

  assert.ok(statCardSource);
  assert.match(statCardSource, /shadow-none/);
  assert.doesNotMatch(statCardSource, /boxShadow|shadow-(?:sm|md|lg|xl|2xl)/);
});

test("referrals renders the empty history state", () => {
  assert.match(referralsSource, /referralSummary\.referrals\.length === 0/);
  assert.match(referralsSource, /No referral history/);
  assert.match(referralsSource, /referral link to get started/);
});

test("referrals renders populated API history without a row menu", () => {
  assert.match(
    referralsSource,
    /referralSummary\.referrals\.map\(\(referral, index\) =>/,
  );
  assert.match(referralsSource, /referral\.name \|\| referral\.email/);
  assert.match(referralsSource, /formatDate\(referral\.createdAt\)/);
  assert.doesNotMatch(referralsSource, /MoreHorizontal|MoreVertical|Ellipsis/);
});

test("referrals renders the disabled-program banner conditionally", () => {
  assert.match(
    referralsSource,
    /referralSummary\.programEnabled \? null : \(/,
  );
  assert.match(referralsSource, /Referral program temporarily closed/);
  assert.match(referralsSource, /accessibilityRole="alert"/);
});

test("referrals uses the public web share URL and provider actions", () => {
  assert.match(
    referralsSource,
    /`\$\{PUBLIC_WEB_ORIGIN\}\/r\/\$\{encodeURIComponent\(referralSummary\.referralCode\)\}`/,
  );
  assert.match(configSource, /EXPO_PUBLIC_WEB_ORIGIN/);
  assert.match(
    configSource,
    /DEFAULT_PUBLIC_WEB_ORIGIN = "https:\/\/tripidly\.com"/,
  );
  assert.doesNotMatch(
    referralsSource,
    /TRUSTED_REQUEST_ORIGIN|API_BASE_URL|hyre-worker-nestjs/,
  );
  assert.doesNotMatch(referralsSource, /\/auth\?ref=/);
  assert.match(referralsSource, /encodeURIComponent\(`\$\{text\}: \$\{shareLink\}`\)/);
  assert.match(referralsSource, /encodeURIComponent\(shareLink\)/);
  assert.match(referralsSource, /shareReferralLink\("whatsapp"\)/);
  assert.match(referralsSource, /shareReferralLink\("telegram"\)/);
});
