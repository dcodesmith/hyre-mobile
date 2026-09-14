import assert from "node:assert/strict";
import test from "node:test";
import {
  addonCatalogKey,
  MAX_BOOKING_ADDONS,
  selectedBookingPricingAddons,
  toggleSelectedAddonId,
} from "./booking-addons.ts";

test("builds a catalog key from addon ids", () => {
  assert.equal(addonCatalogKey([{ id: "a" }, { id: "b" }]), "a|b");
  assert.equal(addonCatalogKey([]), "");
});

test("toggles addon selection and stops at the API max", () => {
  assert.deepEqual(toggleSelectedAddonId([], "addon-1", true), ["addon-1"]);
  assert.deepEqual(toggleSelectedAddonId(["addon-1"], "addon-1", true), [
    "addon-1",
  ]);
  assert.deepEqual(toggleSelectedAddonId(["addon-1"], "addon-1", false), []);

  const filled = Array.from(
    { length: MAX_BOOKING_ADDONS },
    (_, index) => `addon-${index}`,
  );
  assert.deepEqual(toggleSelectedAddonId(filled, "extra", true), filled);
});

test("builds selected add-on pricing rows using booking and leg quantities", () => {
  const addons = [
    {
      id: "booking-addon",
      code: "PROTOCOL",
      name: "Protocol Service",
      description: null,
      pricingUnit: "PER_BOOKING",
      unitPrice: 30000,
      currency: "NGN",
    },
    {
      id: "leg-addon",
      code: "WIFI",
      name: "Wi-Fi",
      description: null,
      pricingUnit: "PER_LEG",
      unitPrice: 2000,
      currency: "NGN",
    },
  ];

  assert.deepEqual(
    selectedBookingPricingAddons(
      addons,
      ["booking-addon", "leg-addon"],
      3,
    ),
    [
      {
        id: "booking-addon",
        code: "PROTOCOL",
        name: "Protocol Service",
        pricingUnit: "PER_BOOKING",
        unitPrice: 30000,
        quantity: 1,
        totalPrice: 30000,
      },
      {
        id: "leg-addon",
        code: "WIFI",
        name: "Wi-Fi",
        pricingUnit: "PER_LEG",
        unitPrice: 2000,
        quantity: 3,
        totalPrice: 6000,
      },
    ],
  );
});
