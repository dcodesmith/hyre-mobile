import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const profileSource = readSource("app/(tabs)/profile.tsx");
const onboardingSource = readSource("app/(tabs)/login/index.tsx");
const detailCardSource = readSource("components/booking-detail-card.tsx");
const timelineSource = readSource("components/booking-timeline-card.tsx");

test("standard profile fields use the onboarding input and gap recipes", () => {
	assert.match(
		profileSource,
		/import \{ AuthTextInput \} from "@\/components\/auth\/auth-text-input"/,
	);
	assert.ok(profileSource.split('<View className="gap-4">').length - 1 >= 2);
	assert.match(onboardingSource, /<View className="gap-4">/);
	assert.doesNotMatch(profileSource, /function FormField/);

	for (const label of ["Name", "Email", "City", "Address"]) {
		assert.match(profileSource, new RegExp(`accessibilityLabel="${label}"`));
	}
});

test("phone controls and profile buttons retain their existing recipes", () => {
	assert.match(profileSource, /className="mt-5 gap-2"/);
	assert.match(profileSource, /className="flex-row gap-2"/);
	assert.match(profileSource, /className="w-\[104px\]"/);
	assert.match(profileSource, /placeholder="\+234 803 123 4675"/);
	assert.match(profileSource, /\{isSendingCode \? "Sending…" : "Send code"\}/);
	assert.match(profileSource, /className="mt-\[54px\] w-\[152px\]"/);
});

test("profile cards reuse the Trip Timeline card shell", () => {
	assert.match(timelineSource, /<DetailCard>/);
	assert.match(
		detailCardSource,
		/overflow-hidden rounded border border-gray-200 bg-white/,
	);
	assert.match(
		detailCardSource,
		/flex-row items-center gap-2 border-b border-gray-200 bg-gray-50 p-4/,
	);
	assert.match(detailCardSource, /<View className="p-4">/);
	assert.equal(profileSource.split("<DetailCard>").length - 1, 2);
	assert.equal(profileSource.split("<DetailCardHeader>").length - 1, 2);
	assert.equal(profileSource.split("<DetailCardBody>").length - 1, 2);
	assert.doesNotMatch(profileSource, /@\/components\/ui\/card/);
});
