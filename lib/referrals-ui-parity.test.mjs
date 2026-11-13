import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const referralsSource = readFileSync(
  new URL("../app/(tabs)/referrals.tsx", import.meta.url),
  "utf8",
);

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
    /`\$\{TRUSTED_REQUEST_ORIGIN\}\/r\/\$\{encodeURIComponent\(referralSummary\.referralCode\)\}`/,
  );
  assert.doesNotMatch(referralsSource, /\/auth\?ref=/);
  assert.match(referralsSource, /shareReferralLink\("whatsapp"\)/);
  assert.match(referralsSource, /shareReferralLink\("telegram"\)/);
});
