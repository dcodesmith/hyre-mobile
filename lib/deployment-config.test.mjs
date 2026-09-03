import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readRepositoryFile = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("keeps preview and production API origins isolated", () => {
	const eas = JSON.parse(readRepositoryFile("eas.json"));

	assert.equal(eas.build.development.environment, "development");
	assert.equal(eas.build.preview.environment, "preview");
	assert.equal(
		eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL,
		"https://hyre-worker-nestjs.fly.dev",
	);
	assert.equal(eas.build.production.environment, "production");
	assert.equal(
		eas.build.production.env.EXPO_PUBLIC_API_BASE_URL,
		"https://hyre-worker-nestjs-production.fly.dev",
	);
	assert.equal(
		eas.build.production.env.EXPO_PUBLIC_TRUSTED_ORIGIN,
		"https://hyre-worker-nestjs-production.fly.dev",
	);
});

test("keeps production builds manual, verified, and approval-gated", () => {
	const workflow = readRepositoryFile(".eas/workflows/production.yml");

	assert.match(workflow, /workflow_dispatch: \{\}/);
	assert.doesNotMatch(workflow, /push:/);
	assert.match(workflow, /type: require-approval/);
	assert.match(workflow, /RELEASE_REF: \$\{\{ github\.ref_name \}\}/);
	assert.match(workflow, /Production builds must run from main\./);
	assert.match(workflow, /root\.environment !== "production"/);
	assert.equal(workflow.match(/needs: \[approve\]/g)?.length, 2);
});
