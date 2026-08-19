import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOLONI_ARTICLES } from "./moloni-articles";
import { buildMoloniInvoicePayload, moloniNetPrice, pickMatchingProductForArticle, pickMatchingProductId } from "./moloni-payload";

describe("Moloni invoice payload", () => {
  it("sends net prices and 6%/23% tax ids", () => {
    const payload = buildMoloniInvoicePayload({
      companyId: 1,
      documentSetId: 2,
      customerId: 3,
      paymentMethodId: 4,
      taxId6: 60,
      taxId23: 230,
      productMap: {
        "noite-inverno-2": 11,
        "elec-6a": 12,
      },
      lines: [
        {
          sku: "noite-inverno-2",
          name: MOLONI_ARTICLES["noite-inverno-2"].name,
          description: "8.49€ Iva 6% 0.51€",
          unitAmountCents: 900,
          quantity: 2,
          vatPercent: 6,
        },
        {
          sku: "elec-6a",
          name: MOLONI_ARTICLES["elec-6a"].name,
          description: "2.85€ Iva 23% 0.65€",
          unitAmountCents: 350,
          quantity: 2,
          vatPercent: 23,
        },
      ],
      yourReference: "stripe:cs_test",
      close: true,
      paymentValueEuros: 25,
      date: "2026-08-18",
    });

    assert.equal(payload.status, 1);
    assert.equal(payload.products[0]?.price, 8.49);
    assert.equal(payload.products[0]?.taxes[0]?.tax_id, 60);
    assert.equal(payload.products[1]?.price, 2.85);
    assert.equal(payload.products[1]?.taxes[0]?.tax_id, 230);
    assert.equal(payload.payments[0]?.value, 25);
    assert.equal(moloniNetPrice(150, 23), 1.22);
  });

  it("matches Moloni product names ignoring accents/case", () => {
    const id = pickMatchingProductId("Noite Verao 2 pessoas 10", [
      { product_id: 9, name: "Noite Verão 2 pessoas 10" },
    ]);
    assert.equal(id, 9);
  });

  it("matches Portuguese decimal comma and punctuation", () => {
    assert.equal(
      pickMatchingProductId("+1.50 EUROS/PESSOA", [{ product_id: 1, name: "+1,50 EUROS/PESSOA" }]),
      1
    );
    assert.equal(
      pickMatchingProductId("Elec 3.50 6A", [{ product_id: 2, name: "Elec 3,50 6A" }]),
      2
    );
    assert.equal(
      pickMatchingProductId("+ de 10m", [{ product_id: 3, name: "+ de 10 m" }]),
      3
    );
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["over-10m"],
        [{ product_id: 4, name: "+ de 9m", price: 1.89 }],
        ["+ de 9m"]
      ),
      4
    );
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["over-10m"],
        [{ product_id: 5, name: "+ extra 9 m", price: 1.89 }],
        []
      ),
      5
    );

    // Night articles matched by alias
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["noite-inverno-2"],
        [{ product_id: 10, name: "NOITE 9 €", price: 7.56 }],
        ["NOITE 9 €", "Noite 9€"]
      ),
      10
    );

    // Night articles matched by price (noite-verao-2 = 10€ gross, 9.43€ net @6%)
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["noite-verao-2"],
        [
          { product_id: 11, name: "NOITE 10 €", price: 9.43 },
          { product_id: 12, name: "Noite Agosto 2 pessoas 11", price: 10.38 },
        ],
        []
      ),
      11
    );

    // Elec alias matching
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["elec-6a"],
        [{ product_id: 20, name: "Elec 3,50 €", price: 2.85 }],
        ["Elec 3,50 €"]
      ),
      20
    );
  });
});
