import assert from "node:assert/strict";
import test from "node:test";
import {
  AIRPORT_PICKUP_BUFFER_MINUTES,
  AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER,
  deriveAirportPickupWindow,
  isUnbookableFlightErrorCode,
  normalizeFlightNumber,
} from "./airport-pickup.ts";

test("normalizeFlightNumber strips spaces and uppercases", () => {
  assert.equal(normalizeFlightNumber(" ba 123 "), "BA123");
  assert.equal(normalizeFlightNumber(null), "");
});

test("deriveAirportPickupWindow applies worker buffer and drive multiplier", () => {
  const arrivalTime = new Date("2026-07-31T10:00:00.000Z");
  const driveTimeMinutes = 50;
  const window = deriveAirportPickupWindow(arrivalTime, driveTimeMinutes);

  assert.equal(AIRPORT_PICKUP_BUFFER_MINUTES, 40);

  const expectedStart = new Date(
    arrivalTime.getTime() + 40 * 60 * 1000,
  );
  const expectedDrive = Math.ceil(
    driveTimeMinutes * AIRPORT_PICKUP_DRIVE_TIME_MULTIPLIER,
  );
  const expectedEnd = new Date(
    expectedStart.getTime() + expectedDrive * 60 * 1000,
  );

  assert.equal(window.startDate.toISOString(), expectedStart.toISOString());
  assert.equal(window.endDate.toISOString(), expectedEnd.toISOString());
  assert.equal(expectedDrive, 60);
});

test("isUnbookableFlightErrorCode covers worker rejection codes", () => {
  assert.equal(isUnbookableFlightErrorCode("FLIGHT_ALREADY_LANDED"), true);
  assert.equal(isUnbookableFlightErrorCode("NETWORK_ERROR"), false);
  assert.equal(isUnbookableFlightErrorCode(undefined), false);
});
