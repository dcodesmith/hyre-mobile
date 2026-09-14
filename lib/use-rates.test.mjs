import assert from "node:assert/strict";
import { mock, test } from "node:test";

const apiRates = {
  platformCustomerServiceFeeRatePercent: 0,
  vatRatePercent: 7.5,
};

mock.module("@/lib/api-client", {
  namedExports: {
    getJson: async (path) => {
      assert.equal(path, "/api/rates");
      return apiRates;
    },
  },
});
mock.module("@tanstack/react-query", {
  namedExports: {
    useQuery: ({ queryFn }) =>
      queryFn({ signal: new AbortController().signal }),
  },
});

const { useRates } = await import("../hooks/use-rates.ts");

test("uses the flat public rates response", async () => {
  assert.deepEqual(await useRates(), apiRates);
});
