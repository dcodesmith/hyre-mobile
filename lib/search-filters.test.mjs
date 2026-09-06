import assert from "node:assert/strict";
import test from "node:test";
import { buildResultsHeading } from "./search-filters.ts";

test("buildResultsHeading names a single vehicle type and joins multiple types", () => {
  assert.equal(buildResultsHeading(6, []), "6 vehicles");
  assert.equal(buildResultsHeading(1, []), "1 vehicle");
  assert.equal(buildResultsHeading(6, ["SEDAN"]), "6 sedans");
  assert.equal(buildResultsHeading(1, ["SUV"]), "1 SUV");
  assert.equal(buildResultsHeading(23, ["SUV", "SEDAN"]), "23 SUVs and sedans");
  assert.equal(buildResultsHeading(1, ["SUV", "SEDAN"]), "1 SUV or sedan");
});
