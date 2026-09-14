import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOLONI_ARTICLES } from "./moloni-articles";
import { extractMoloniError } from "./moloni-client";
import { moloniCustomerTitle } from "./moloni-invoice";
import { buildMoloniInvoicePayload, moloniNetPrice, pickMatchingProductForArticle, pickMatchingProductId } from "./moloni-payload";

describe("Moloni invoice payload", () => {
  it("builds customer title as country · plate", () => {
    assert.equal(moloniCustomerTitle("1800 CXB", "France"), "FRANCE · 1800CXB");
    assert.equal(moloniCustomerTitle("dh070cc", null), "DH070CC");
    assert.equal(moloniCustomerTitle("", "Portugal"), "");
  });
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
    assert.equal(payload.products[0]?.taxes[0]?.value, 6);
    assert.equal(payload.products[1]?.price, 2.845);
    assert.equal(payload.products[1]?.taxes[0]?.tax_id, 230);
    assert.equal(payload.products[1]?.taxes[0]?.value, 23);
    assert.equal(payload.payments[0]?.value, 25);
    assert.equal(payload.payments[0]?.date, "2026-08-18 12:00:00");
    assert.equal(moloniNetPrice(150, 23), 1.22);
  });

  it("uses line net prices that keep tax-inclusive totals exact", () => {
    const payload = buildMoloniInvoicePayload({
      companyId: 1,
      documentSetId: 2,
      customerId: 3,
      paymentMethodId: 4,
      taxId6: 60,
      taxId23: 230,
      productMap: {
        "noite-agosto-2": 11,
        "elec-6a": 12,
      },
      lines: [
        {
          sku: "elec-6a",
          name: MOLONI_ARTICLES["elec-6a"].name,
          description: "",
          unitAmountCents: 350,
          quantity: 2,
          vatPercent: 23,
        },
        {
          sku: "noite-agosto-2",
          name: MOLONI_ARTICLES["noite-agosto-2"].name,
          description: "",
          unitAmountCents: 1100,
          quantity: 2,
          vatPercent: 6,
        },
      ],
      yourReference: "stripe:cs_test",
      close: false,
      paymentValueEuros: 29,
      date: "2026-08-21",
    });

    // 2×3.50€ @23% + 2×11€ @6% = 29.00€ TTC (not 29.02)
    assert.equal(payload.products[0]?.price, 2.845);
    assert.equal(payload.products[1]?.price, 10.375);
    assert.equal(payload.payments[0]?.value, 29);
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

    // noite-inverno-2: "NOITE 9 €" (9€ gross, 8.49€ net @6%)
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["noite-inverno-2"],
        [{ product_id: 10, name: "NOITE 9 €", price: 8.49 }],
        ["NOITE 9 €"]
      ),
      10
    );

    // noite-inverno-34: "NOITE 10 € (3/4 PAX)" (11€ gross, 10.38€ net @6%)
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["noite-inverno-34"],
        [{ product_id: 11, name: "NOITE 10 € (3/4 PAX)", price: 10.38 }],
        ["NOITE 10 € (3/4 PAX)"]
      ),
      11
    );

    // noite-verao-2: "nuit ete 2P 10€" (10€ gross, 9.43€ net @6%)
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["noite-verao-2"],
        [
          { product_id: 12, name: "nuit ete 2P 10€", price: 9.43 },
          { product_id: 13, name: "NOITE 10 € (3/4 PAX)", price: 10.38 },
        ],
        ["nuit ete 2P 10€", "nuit ete 2 P 10€"]
      ),
      12
    );

    // noite-verao-34: "nuit ete 3P ou 4P 12€" (12€ gross, 11.32€ net @6%)
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["noite-verao-34"],
        [{ product_id: 14, name: "nuit ete 3P ou 4P 12€", price: 11.32 }],
        ["nuit ete 3P ou 4P 12€"]
      ),
      14
    );

    // noite-agosto-2: "nuit aout 2P 11€"
    assert.equal(
      pickMatchingProductForArticle(
        MOLONI_ARTICLES["noite-agosto-2"],
        [{ product_id: 15, name: "nuit aout 2P 11€", price: 10.38 }],
        ["nuit aout 2P 11€"]
      ),
      15
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

  it("surfaces Moloni insert error objects instead of ignoring them", () => {
    assert.equal(extractMoloniError({ error: 1 }), "Sessão Moloni inválida ou expirada. Volte a sincronizar.");
    assert.match(String(extractMoloniError({ error: { 0: "27" }, valid: 0 })), /27/);
    assert.equal(extractMoloniError({ valid: 0 }), "Pedido Moloni rejeitado (valid=0)");
  });

  it("does not treat companies/getAll success arrays as errors", () => {
    assert.equal(
      extractMoloniError([
        { email: "demo@moloni.com", company_id: 5, name: "Empresa Demonstração" },
        { email: "algarvecampingcarpark@gmail.com", company_id: 14690, name: "RABAT E GALINIER LDA" },
      ]),
      null
    );
  });

  it("does not treat languages/getAll success arrays as errors", () => {
    assert.equal(
      extractMoloniError([
        { language_id: 1, code: "PT", title: "Português" },
        { language_id: 2, code: "ES", title: "Español" },
        { language_id: 3, code: "EN", title: "English" },
      ]),
      null
    );
  });

  it("treats Moloni validation error arrays as errors", () => {
    assert.match(String(extractMoloniError(["1 customer_id", "2 products"])), /customer_id/);
    assert.match(
      String(
        extractMoloniError([
          { code: "1 customer_id", description: "Field 'customer_id' is required" },
        ])
      ),
      /customer_id/
    );
  });
});
