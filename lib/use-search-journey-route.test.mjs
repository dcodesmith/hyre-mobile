import assert from "node:assert/strict";
import { mock, test } from "node:test";

const setParamsCalls = [];

mock.module("react", {
  namedExports: {
    useEffect: (effect) => effect(),
  },
});

mock.module("expo-router", {
  namedExports: {
    useRouter: () => ({
      setParams: (params) => setParamsCalls.push(params),
    }),
  },
});

const { useSearchJourneyRoute } = await import(
  "../hooks/use-search-journey-route.ts"
);

const ROUTE_SEARCH_ID = "01994a1d-4263-7000-8000-000000000010";
const RESULT_SEARCH_ID = "01994a1d-4263-7000-8000-000000000011";

test("useSearchJourneyRoute preserves a valid route journey", () => {
  setParamsCalls.length = 0;

  const result = useSearchJourneyRoute({
    routeSearchId: ROUTE_SEARCH_ID,
    resultSearchId: RESULT_SEARCH_ID,
  });

  assert.equal(result, ROUTE_SEARCH_ID);
  assert.deepEqual(setParamsCalls, []);
});

test("useSearchJourneyRoute exposes and synchronizes a fresh result journey", () => {
  setParamsCalls.length = 0;

  const result = useSearchJourneyRoute({
    resultSearchId: RESULT_SEARCH_ID,
  });

  assert.equal(result, RESULT_SEARCH_ID);
  assert.deepEqual(setParamsCalls, [{ searchId: RESULT_SEARCH_ID }]);
});

test("useSearchJourneyRoute ignores invalid result journeys", () => {
  setParamsCalls.length = 0;

  const result = useSearchJourneyRoute({
    resultSearchId: "not-a-uuid",
  });

  assert.equal(result, undefined);
  assert.deepEqual(setParamsCalls, []);
});
