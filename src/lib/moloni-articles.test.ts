import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MOLONI_ARTICLES,
  accountingLinesFromNights,
  accountingLinesTotalCents,
  formatVatDescription,
  moloniUnitNetPrice,
  nightArticleForSeason,
  occupancyBucket,
  splitInclusiveVat,
  type StayNightParts,
} from "./moloni-articles";

describe("Moloni VAT split (tax-inclusive)", () => {
  it("matches the owners’ article breakdowns", () => {
    assert.deepEqual(splitInclusiveVat(150, 23), { netCents: 122, vatCents: 28 });
    assert.deepEqual(splitInclusiveVat(200, 6), { netCents: 189, vatCents: 11 });
    assert.deepEqual(splitInclusiveVat(350, 23), { netCents: 285, vatCents: 65 });
    assert.deepEqual(splitInclusiveVat(400, 23), { netCents: 325, vatCents: 75 });
    assert.deepEqual(splitInclusiveVat(900, 6), { netCents: 849, vatCents: 51 });
    assert.deepEqual(splitInclusiveVat(1000, 6), { netCents: 943, vatCents: 57 });
    assert.deepEqual(splitInclusiveVat(1100, 6), { netCents: 1038, vatCents: 62 });
    assert.deepEqual(splitInclusiveVat(1200, 6), { netCents: 1132, vatCents: 68 });
    assert.deepEqual(splitInclusiveVat(1300, 6), { netCents: 1226, vatCents: 74 });
  });

  it("keeps multi-qty lines equal to the tax-inclusive gross", () => {
    // 2 × 3.50€ @ 23% → 7.00€ TTC
    assert.equal(moloniUnitNetPrice(350, 2, 23), 2.845);
    // 2 × 11€ @ 6% → 22.00€ TTC
    assert.equal(moloniUnitNetPrice(1100, 2, 6), 10.375);
  });

  it("formats descriptions like Moloni", () => {
    assert.equal(formatVatDescription(150, 23), "1.22€ Iva 23% 0.28€");
    assert.equal(formatVatDescription(900, 6), "8.49€ Iva 6% 0.51€");
  });
});

describe("night article mapping", () => {
  it("maps season and occupancy to Moloni names", () => {
    assert.equal(occupancyBucket(2), "2");
    assert.equal(occupancyBucket(1), "2");
    assert.equal(occupancyBucket(3), "3_4");
    assert.equal(occupancyBucket(5), "3_4");
    assert.equal(nightArticleForSeason("low", "2").name, "Noite Inverno 2 pessoas 9");
    assert.equal(nightArticleForSeason("winter", "3_4").name, "Noite Inverno 3/4 pessoas 11");
    assert.equal(nightArticleForSeason("summer", "2").name, "Noite Verao 2 pessoas 10");
    assert.equal(nightArticleForSeason("august", "3_4").name, "Noite Agosto 3/4 pessoas 13");
  });
});

function night(partial: Partial<StayNightParts> & Pick<StayNightParts, "season" | "occupancy" | "nightCentsWithoutElectricity">): StayNightParts {
  return {
    extraGuestCount: 0,
    extraGuestUnitCents: 150,
    electricityAmperage: null,
    electricity6aCents: 350,
    electricity10aCents: 400,
    over10m: false,
    over10mCents: 200,
    manuals: [],
    ...partial,
  };
}

describe("Stripe/Moloni stay lines", () => {
  it("splits electric winter 2-person stay into night + 6A", () => {
    const lines = accountingLinesFromNights([
      night({
        season: "low",
        occupancy: "2",
        nightCentsWithoutElectricity: 900,
        electricityAmperage: 6,
      }),
      night({
        season: "low",
        occupancy: "2",
        nightCentsWithoutElectricity: 900,
        electricityAmperage: 6,
      }),
    ]);

    assert.equal(accountingLinesTotalCents(lines), 2500);
    assert.equal(lines[0]?.name, MOLONI_ARTICLES["elec-6a"].name);
    assert.equal(lines[0]?.quantity, 2);
    assert.equal(lines[1]?.name, MOLONI_ARTICLES["noite-inverno-2"].name);
    assert.equal(lines[1]?.quantity, 2);
  });

  it("uses 10A article, extra person and +10m", () => {
    const lines = accountingLinesFromNights([
      night({
        season: "august",
        occupancy: "3_4",
        nightCentsWithoutElectricity: 1300,
        extraGuestCount: 1,
        electricityAmperage: 10,
        over10m: true,
      }),
    ]);

    assert.equal(accountingLinesTotalCents(lines), 1300 + 150 + 400 + 200);
    const names = lines.map((line) => line.name);
    assert.deepEqual(names, [
      "+1.50 EUROS/PESSOA",
      "+ de 10m",
      "Elec 4 10A",
      "Noite Agosto 3/4 pessoas 13",
    ]);
  });

  it("keeps mixed seasons as separate night articles", () => {
    const lines = accountingLinesFromNights([
      night({ season: "summer", occupancy: "2", nightCentsWithoutElectricity: 1000 }),
      night({ season: "august", occupancy: "2", nightCentsWithoutElectricity: 1100 }),
    ]);
    assert.equal(accountingLinesTotalCents(lines), 2100);
    assert.equal(lines.find((line) => line.sku === "noite-verao-2")?.quantity, 1);
    assert.equal(lines.find((line) => line.sku === "noite-agosto-2")?.quantity, 1);
  });
});
