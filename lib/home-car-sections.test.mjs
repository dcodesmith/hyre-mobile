import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeCarSections } from "./home-car-sections.ts";

const car = (id, overrides = {}) => ({
  id,
  make: "Toyota",
  model: "Corolla",
  year: 2024,
  dayRate: 250,
  passengerCapacity: 4,
  pricingIncludesFuel: false,
  vehicleType: "SEDAN",
  serviceTier: "STANDARD",
  images: [{ url: "https://example.com/car.webp" }],
  averageRating: 0,
  totalReviews: 0,
  promotion: null,
  ...overrides,
});

test("shows all vehicles when no category reaches the minimum size", () => {
  const cars = [car("one"), car("two")];

  const sections = buildHomeCarSections({
    categories: [],
    allCars: cars,
    total: cars.length,
  });

  assert.deepEqual(
    sections.map((section) => section.key),
    ["all"],
  );
  assert.deepEqual(sections[0].cars, cars);
});

test("keeps all vehicles after category sections", () => {
  const suv = car("suv", { vehicleType: "SUV" });
  const sedan = car("sedan");

  const sections = buildHomeCarSections({
    categories: [
      {
        name: "suv",
        title: "SUV",
        type: "vehicleType",
        cars: [suv],
      },
    ],
    allCars: [suv, sedan],
    total: 2,
  });

  assert.deepEqual(
    sections.map((section) => section.key),
    ["suv", "all"],
  );
  assert.deepEqual(sections.at(-1).cars, [suv, sedan]);
});

test("puts promoted vehicles in an On Sale section first", () => {
  const promoted = car("sale", {
    promotion: { id: "promo", name: "Deal", discountValue: 10 },
  });

  const sections = buildHomeCarSections({
    categories: [],
    allCars: [promoted, car("regular")],
    total: 2,
  });

  assert.deepEqual(
    sections.map(({ key, searchQuery }) => [key, searchQuery]),
    [
      ["on-sale", "dealsOnly=true"],
      ["all", ""],
    ],
  );
  assert.deepEqual(sections[0].cars, [promoted]);
});
