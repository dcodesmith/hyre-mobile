import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBookingUnits,
  getFromDateMinDate,
  isValidToDateSelection,
  normalizeBookingTimeWindow,
} from "./booking-utils.ts";

const atLocal = (year, monthIndex, day, hour = 0, minute = 0) =>
  new Date(year, monthIndex, day, hour, minute, 0, 0);

test("DAY bookings roll From to tomorrow after 11:00 AM", () => {
  const morning = atLocal(2026, 6, 31, 11, 0);
  const afternoon = atLocal(2026, 6, 31, 11, 1);

  assert.equal(getFromDateMinDate("DAY", morning).getDate(), 31);
  assert.equal(getFromDateMinDate("DAY", afternoon).getDate(), 1);
  assert.equal(getFromDateMinDate("DAY", afternoon).getMonth(), 7);
});

test("NIGHT and FULL_DAY reject same-day To selection", () => {
  const from = atLocal(2026, 6, 31);
  const sameDay = atLocal(2026, 6, 31);
  const nextDay = atLocal(2026, 7, 1);

  assert.equal(isValidToDateSelection("NIGHT", from, sameDay), false);
  assert.equal(isValidToDateSelection("FULL_DAY", from, sameDay), false);
  assert.equal(isValidToDateSelection("NIGHT", from, nextDay), true);
  assert.equal(isValidToDateSelection("DAY", from, sameDay), true);
});

test("calculateBookingUnits mirrors worker day/night/full-day rules", () => {
  const from = atLocal(2026, 9, 26);
  const sameDay = atLocal(2026, 9, 26);
  const nextDay = atLocal(2026, 9, 27);

  assert.equal(calculateBookingUnits(from, sameDay, "DAY"), 1);
  assert.equal(calculateBookingUnits(from, nextDay, "DAY"), 2);
  assert.equal(calculateBookingUnits(from, nextDay, "NIGHT"), 1);
  assert.equal(calculateBookingUnits(from, nextDay, "FULL_DAY"), 1);
  assert.equal(calculateBookingUnits(from, nextDay, "AIRPORT_PICKUP"), 1);
});

test("normalizeBookingTimeWindow aligns DAY and NIGHT payloads", () => {
  const startDate = atLocal(2026, 6, 31);
  const endDate = atLocal(2026, 6, 31);

  const dayWindow = normalizeBookingTimeWindow({
    bookingType: "DAY",
    startDate,
    endDate,
    pickupTime: "9:00 AM",
  });
  assert.equal(dayWindow.startDate.getHours(), 9);
  assert.equal(dayWindow.endDate.getHours(), 21);

  const nightWindow = normalizeBookingTimeWindow({
    bookingType: "NIGHT",
    startDate: atLocal(2026, 6, 31),
    endDate: atLocal(2026, 7, 1),
  });
  assert.equal(nightWindow.startDate.getHours(), 23);
  assert.equal(nightWindow.endDate.getHours(), 5);
  assert.equal(nightWindow.endDate.getDate(), 1);
});
