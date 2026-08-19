import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTotalPrice } from "./pricing";
import type { ZoneRate } from "../types/database";
import { FALLBACK_SUPPLEMENTS } from "./pricing-supplements";

const electricWinter: ZoneRate = {
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

describe("calculateTotalPrice Moloni lines", () => {
  it("matches electric winter 2-person total with night + 6A", () => {
    const pricing = calculateTotalPrice(
      [electricWinter],
      "2026-02-01",
      "2026-02-04",
      2,
      { electricityAmperage: 6, supplements: FALLBACK_SUPPLEMENTS }
    );
    assert.equal(pricing.totalCents, 3750);
    assert.equal(pricing.nights, 3);
    const bySku = Object.fromEntries(pricing.lines.map((line) => [line.sku, line]));
    assert.equal(bySku["noite-inverno-2"]?.quantity, 3);
    assert.equal(bySku["noite-inverno-2"]?.unitAmountCents, 900);
    assert.equal(bySku["elec-6a"]?.quantity, 3);
    assert.equal(bySku["elec-6a"]?.unitAmountCents, 350);
  });

  it("adds extra person, 10A and +10m on top of 3/4 august night", () => {
    const august: ZoneRate = {
      ...electricWinter,
      start_date: "2026-08-01",
      end_date: "2026-08-31",
      price_cents_per_night: 1450,
      price_cents_3_4_guests: 1650,
      season: "august",
    };
    const pricing = calculateTotalPrice([august], "2026-08-10", "2026-08-12", 5, {
      electricityAmperage: 10,
      motorhomeOver9m: true,
      supplements: FALLBACK_SUPPLEMENTS,
    });
    // 2 nights * (16.50 occupancy 3/4 + 1.50 extra + 0.50 10A + 2.00 length) wait
    // occupancy 3/4 electric = 16.50 = 13 night + 3.50 elec
    // extra 1.50, 10A surcharge 0.50, +10m 2.00
    // per night = 16.50 + 1.50 + 0.50 + 2.00 = 20.50
    assert.equal(pricing.totalCents, 4100);
    assert.ok(pricing.lines.length > 0);
    const totalFromLines = pricing.lines.reduce(
      (sum, line) => sum + line.unitAmountCents * line.quantity,
      0
    );
    assert.equal(totalFromLines, pricing.totalCents);
  });
});
