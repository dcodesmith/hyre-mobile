import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCarSearchRequest,
  carSearchQueryKeyParams,
} from "./car-search-request.ts";

const SEARCH_ID = "01994a1d-4263-7000-8000-000000000010";

test("buildCarSearchRequest sends searchId as a header, not a query param", () => {
  const request = buildCarSearchRequest({
    bookingType: "DAY",
    from: "2026-08-20",
    to: "2026-08-21",
    searchId: SEARCH_ID,
    page: 1,
    limit: 12,
  });

  assert.equal(
    request.path,
    "/api/cars/search?from=2026-08-20&to=2026-08-21&bookingType=DAY&page=1&limit=12",
  );
  assert.deepEqual(request.headers, { "X-Search-Id": SEARCH_ID });
});

test("buildCarSearchRequest omits X-Search-Id for count-only and invalid ids", () => {
  assert.equal(
    buildCarSearchRequest({
      bookingType: "DAY",
      searchId: SEARCH_ID,
      countOnly: true,
    }).headers,
    undefined,
  );
  assert.equal(
    buildCarSearchRequest({
      bookingType: "DAY",
      searchId: "not-a-uuid",
    }).headers,
    undefined,
  );
});

test("carSearchQueryKeyParams keys full searches by journey but not count-only requests", () => {
  const fullSearch = {
    bookingType: "DAY",
    searchId: SEARCH_ID,
  };
  const countOnly = {
    ...fullSearch,
    countOnly: true,
  };

  assert.equal(carSearchQueryKeyParams(fullSearch).searchId, SEARCH_ID);
  assert.equal(carSearchQueryKeyParams(countOnly).searchId, undefined);
});
