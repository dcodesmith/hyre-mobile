import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const profileSource = readSource("app/(tabs)/profile.tsx");
const detailCardSource = readSource("components/booking-detail-card.tsx");
const timelineSource = readSource("components/booking-timeline-card.tsx");
const bookingCardSource = readSource("components/car-detail/BookingDetailsCard.tsx");
const bookingFieldSource = readSource(
	"components/ui/address-autocomplete-input.tsx",
);
const bookingPhoneSource = readSource(
	"components/car-detail/BookingPhoneVerification.tsx",
);

const bookingFieldClassName =
	"h-11 text-sm border-neutral-200 bg-white shadow-none";
const bookingFieldLabelClassName = "text-sm font-semibold text-gray-900";

test("standard profile fields use the booking card field", () => {
	assert.match(profileSource, /import \{ Input \} from "@\/components\/ui\/input"/);
	assert.doesNotMatch(profileSource, /AuthTextInput/);
	assert.doesNotMatch(profileSource, /function FormField/);
	assert.match(
		bookingFieldSource,
		/import \{ Input \} from "@\/components\/ui\/input"/,
	);
	assert.ok(bookingCardSource.includes(bookingFieldClassName));
	assert.ok(profileSource.includes(bookingFieldClassName));
	assert.ok(bookingCardSource.includes(bookingFieldLabelClassName));
	assert.ok(profileSource.includes(bookingFieldLabelClassName));
	assert.match(profileSource, /className="gap-5"/);
	assert.match(profileSource, /className="gap-2"/);

	for (const label of ["Name", "Email", "City", "Address"]) {
		assert.match(profileSource, new RegExp(`accessibilityLabel="${label}"`));
		assert.match(profileSource, new RegExp(`>\\s*${label}\\s*<`));
	}

	assert.match(profileSource, /placeholder="Enter name"/);
	assert.match(profileSource, /placeholder="Enter city"/);
	assert.match(profileSource, /placeholder="Enter address"/);
	assert.doesNotMatch(profileSource, /placeholder="Enter email"/);
});

test("phone row stays inline at the booking field height", () => {
	assert.match(
		profileSource,
		/import \{ BookingPhoneVerification \} from "@\/components\/car-detail\/BookingPhoneVerification"/,
	);
	assert.match(profileSource, /<BookingPhoneVerification/);
	assert.match(profileSource, /allowChange/);
	assert.match(bookingPhoneSource, /className="flex-row items-center gap-2"/);
	assert.match(bookingPhoneSource, /className="h-11 rounded-md px-4"/);
	assert.match(
		bookingPhoneSource,
		/\{phone\.isSubmitting \? "Sending…" : "Send code"\}/,
	);
	assert.match(
		bookingPhoneSource,
		/\{phone\.isSubmitting \? "Verifying…" : "Verify"\}/,
	);
});

test("profile buttons keep the agreed Save Changes height", () => {
	assert.match(profileSource, /className="mt-6 w-\[152px\]"/);
	assert.match(profileSource, /className="h-12 w-full rounded-md bg-neutral-900"/);
	assert.match(
		profileSource,
		/className="h-12 w-full rounded-md bg-destructive\/10 shadow-none active:bg-destructive\/20"/,
	);
	assert.match(profileSource, /className="mt-8 gap-5"/);
	assert.match(profileSource, /className="mt-3 h-px bg-\[#E5E7EB\]"/);
	assert.doesNotMatch(profileSource, /mt-\[54px\]/);
});

test("account deletion requires confirmation and calls the account service", () => {
	assert.match(profileSource, /await deleteCurrentUserAccount\(\)/);
	assert.match(
		profileSource,
		/<DialogTitle>Are you absolutely sure\?<\/DialogTitle>/,
	);
	assert.match(profileSource, /onPress=\{\(\) => void deleteAccount\(\)\}/);
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
