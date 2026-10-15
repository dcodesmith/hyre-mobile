import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchId, reusedSearchJourneyId } from "./search-id.ts";

const SEARCH_ID = "01994a1d-4263-7000-8000-000000000010";

test("parseSearchId accepts a UUID and ignores everything else", () => {
  assert.equal(parseSearchId(SEARCH_ID), SEARCH_ID);
  assert.equal(parseSearchId([SEARCH_ID, "other"]), SEARCH_ID);
  assert.equal(parseSearchId(" not-a-uuid "), null);
  assert.equal(parseSearchId(""), null);
  assert.equal(parseSearchId(undefined), null);
});

test("reusedSearchJourneyId keeps the id only for same-page date refinements", () => {
  assert.equal(
    reusedSearchJourneyId({
      currentSearchId: SEARCH_ID,
      isSameSearchPage: true,
      currentBookingType: "DAY",
      nextBookingType: "DAY",
    }),
    SEARCH_ID,
  );
  assert.equal(
    reusedSearchJourneyId({
      currentSearchId: SEARCH_ID,
      isSameSearchPage: true,
      currentBookingType: "DAY",
      nextBookingType: "NIGHT",
    }),
    null,
  );
  assert.equal(
    reusedSearchJourneyId({
      currentSearchId: SEARCH_ID,
      isSameSearchPage: false,
      currentBookingType: "DAY",
      nextBookingType: "DAY",
    }),
    null,
  );
});
