import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailyTransactionsPdf } from "@/lib/admin-metrics";

describe("buildDailyTransactionsPdf", () => {
  it("builds a PDF with empty transactions (no WinAnsi crash)", async () => {
    const bytes = await buildDailyTransactionsPdf({
      reportDate: "2026-09-14",
      periodStart: new Date("2026-09-13T12:00:00.000Z"),
      periodEnd: new Date("2026-09-14T12:00:00.000Z"),
      transactions: [],
    });
    assert.ok(bytes.byteLength > 100);
    assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), "%PDF");
  });

  it("builds a PDF with accented names and euro amounts", async () => {
    const bytes = await buildDailyTransactionsPdf({
      reportDate: "2026-09-14",
      periodStart: new Date("2026-09-13T12:00:00.000Z"),
      periodEnd: new Date("2026-09-14T12:00:00.000Z"),
      transactions: [
        {
          id: "pay_1",
          amount_cents: 2500,
          payment_method: "stripe",
          created_at: "2026-09-14T10:00:00.000Z",
          vehicle_plate: "12-AB-34",
          guest_name: "Marta Hernández",
          country: "España",
        },
      ],
    });
    assert.ok(bytes.byteLength > 100);
    assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), "%PDF");
  });
});
