import assert from "node:assert/strict";
import { mock, test } from "node:test";

const REQUEST_CANCELLED_CODE = "REQUEST_CANCELLED";

class ApiError extends Error {
  constructor(message, { status, data }) {
    super(message);
    this.status = status;
    this.code = data?.code;
  }
}

let getJsonImpl = async () => ({ addons: [] });

mock.module("@/lib/api-client", {
  namedExports: {
    ApiError,
    REQUEST_CANCELLED_CODE,
    getJson: (...args) => getJsonImpl(...args),
  },
});

const { fetchPublicAddons } = await import("./fetch-public-addons.ts");

test("returns catalog addons for the booking type", async () => {
  getJsonImpl = async (path) => {
    assert.equal(path, "/api/addons?bookingType=DAY");
    return { addons: [{ id: "addon-1", name: "Wifi" }] };
  };

  assert.deepEqual(await fetchPublicAddons("DAY"), [
    { id: "addon-1", name: "Wifi" },
  ]);
});

test("hides a missing or failed catalog as an empty list", async () => {
  getJsonImpl = async () => ({ addons: null });
  assert.deepEqual(await fetchPublicAddons("NIGHT"), []);

  getJsonImpl = async () => {
    throw new Error("offline");
  };
  assert.deepEqual(await fetchPublicAddons("NIGHT"), []);
});

test("rethrows cancellation so React Query does not cache an empty catalog", async () => {
  getJsonImpl = async () => {
    throw new ApiError("Request cancelled", {
      status: 0,
      data: { code: REQUEST_CANCELLED_CODE },
    });
  };

  await assert.rejects(
    () => fetchPublicAddons("DAY"),
    (error) => {
      assert.equal(error.code, REQUEST_CANCELLED_CODE);
      return true;
    },
  );
});
