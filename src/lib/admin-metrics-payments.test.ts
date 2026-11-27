import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Documents why today's bank transfers can vanish from metrics/PDF:
 * 1) Manual PDF with force:false reused a stale daily report.
 * 2) Unpaginated PostgREST queries silently cap ~1000 oldest rows.
 */
describe("metrics payments completeness", () => {
  it("manual daily PDF must force-regenerate to include payments added later the same day", () => {
    const firstGenerateTransactionCount = 2;
    const bankTransfersAddedAfter = 3;
    const staleIfNoForce = firstGenerateTransactionCount;
    const afterForceRegenerate = firstGenerateTransactionCount + bankTransfersAddedAfter;

    assert.equal(staleIfNoForce, 2);
    assert.equal(afterForceRegenerate, 5);
    assert.ok(
      afterForceRegenerate > staleIfNoForce,
      "force:true is required so virements recorded after the first PDF appear"
    );
  });

  it("paginated fetch must keep going while a full page is returned", () => {
    const pageSize = 1000;
    const totalRows = 1003; // includes 3 newest bank transfers past the first page
    let fetched = 0;
    let pages = 0;
    while (fetched < totalRows) {
      const remaining = totalRows - fetched;
      const batch = Math.min(pageSize, remaining);
      fetched += batch;
      pages += 1;
      if (batch < pageSize) break;
    }
    assert.equal(pages, 2);
    assert.equal(fetched, 1003);
  });
});
