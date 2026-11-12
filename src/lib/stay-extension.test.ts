import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTotalPrice } from "./pricing";
import { computeExtensionCharge } from "./stay-extension";
import type { ZoneRate } from "../types/database";
import { FALLBACK_SUPPLEMENTS } from "./pricing-supplements";

const winter: ZoneRate = {
  id: "r1",
  zone_id: "z1",
  start_date: "2026-01-01",
  end_date: "2026-06-14",
  price_cents_per_night: 1250,
  price_cents_3_4_guests: 1450,
  min_nights: 1,
  season: "low",
  created_at: "2026-01-01",
};

describe("computeExtensionCharge", () => {
  it("charges only the extra nights, keeping the stored total intact", () => {
    const charge = computeExtensionCharge(10_000, 2500);
    assert.equal(charge.extensionCents, 2500);
    assert.equal(charge.newTotalCents, 12_500);
  });

  it("does not invent a charge when extra nights are free", () => {
    const charge = computeExtensionCharge(10_000, 0);
    assert.equal(charge.extensionCents, 0);
    assert.equal(charge.newTotalCents, 10_000);
  });
});

describe("extension vs full-stay delta (regression)", () => {
  it("does not overcharge when current rates exceed the stored booking total", () => {
    // Original stay: 3 nights booked historically at a lower total than today's rates.
    const storedTotalCents = 3000; // cheaper than 3 × 1250
    const extraNights = calculateTotalPrice(
      [winter],
      "2026-02-04",
      "2026-02-06",
      2,
      { electricityAmperage: 6, supplements: FALLBACK_SUPPLEMENTS }
    );
    const fullReprice = calculateTotalPrice(
      [winter],
      "2026-02-01",
      "2026-02-06",
      2,
      { electricityAmperage: 6, supplements: FALLBACK_SUPPLEMENTS }
    );

    const legacyDelta = Math.max(0, fullReprice.totalCents - storedTotalCents);
    const fixed = computeExtensionCharge(storedTotalCents, extraNights.totalCents);

    assert.equal(extraNights.nights, 2);
    assert.equal(fixed.extensionCents, extraNights.totalCents);
    assert.ok(
      legacyDelta > fixed.extensionCents,
      "legacy full-stay delta overcharges when rates rose after booking"
    );
  });

  it("still charges extra nights when full-stay delta would be zero", () => {
    // Stored total already higher than a full reprice of old+new nights.
    const storedTotalCents = 50_000;
    const extraNights = calculateTotalPrice(
      [winter],
      "2026-02-04",
      "2026-02-05",
      2,
      { electricityAmperage: 6, supplements: FALLBACK_SUPPLEMENTS }
    );
    const fullReprice = calculateTotalPrice(
      [winter],
      "2026-02-01",
      "2026-02-05",
      2,
      { electricityAmperage: 6, supplements: FALLBACK_SUPPLEMENTS }
    );

    const legacyDelta = Math.max(0, fullReprice.totalCents - storedTotalCents);
    const fixed = computeExtensionCharge(storedTotalCents, extraNights.totalCents);

    assert.equal(legacyDelta, 0);
    assert.ok(fixed.extensionCents > 0);
    assert.equal(fixed.extensionCents, extraNights.totalCents);
  });

  it("A14 case: extending ~same length must not re-charge the original booking total", () => {
    // Guest paid 30 nights (stored total). Admin extends another 30 nights.
    // Legacy formula (full reprice − stored total) equals the original payment again —
    // so Stripe asked for 406 € a second time instead of the prolongation supplement.
    const opts = { electricityAmperage: 6 as const, supplements: FALLBACK_SUPPLEMENTS };
    const originalStay = calculateTotalPrice([winter], "2026-02-01", "2026-03-03", 2, opts);
    const storedTotalCents = originalStay.totalCents; // e.g. booking payment
    const extraNights = calculateTotalPrice([winter], "2026-03-03", "2026-04-02", 2, opts);
    const fullReprice = calculateTotalPrice([winter], "2026-02-01", "2026-04-02", 2, opts);

    const legacyDelta = Math.max(0, fullReprice.totalCents - storedTotalCents);
    const fixed = computeExtensionCharge(storedTotalCents, extraNights.totalCents);

    assert.equal(originalStay.nights, 30);
    assert.equal(extraNights.nights, 30);
    assert.equal(
      legacyDelta,
      storedTotalCents,
      "legacy delta re-asks the original booking amount when extending the same length"
    );
    assert.equal(fixed.extensionCents, extraNights.totalCents);
    assert.equal(fixed.newTotalCents, storedTotalCents + extraNights.totalCents);
    // Stripe must charge the prolongation nights — not replay paid_cents / total_cents.
    assert.notEqual(fixed.extensionCents, 0);
  });
});
