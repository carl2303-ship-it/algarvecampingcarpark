import type Stripe from "stripe";
import {
  MOLONI_ARTICLE_LIST,
  VAT_ACCOMMODATION_PERCENT,
  VAT_STANDARD_PERCENT,
  formatVatDescription,
  type AccountingLine,
  type MoloniArticle,
  type VatPercent,
} from "@/lib/moloni-articles";

const PRODUCT_SKU_META = "moloni_sku";
const TAX_VAT_META = "moloni_vat";

export type MoloniStripeCatalog = {
  productsBySku: Record<string, string>;
  taxRateByPercent: Record<VatPercent, string>;
};

let catalogCache: MoloniStripeCatalog | null = null;

export function resetMoloniStripeCatalogCache() {
  catalogCache = null;
}

async function findTaxRateId(
  stripe: Stripe,
  percent: VatPercent
): Promise<string | null> {
  for await (const rate of stripe.taxRates.list({ limit: 100, active: true })) {
    if (rate.metadata?.[TAX_VAT_META] === String(percent) && rate.inclusive) {
      return rate.id;
    }
  }
  return null;
}

async function ensureTaxRate(stripe: Stripe, percent: VatPercent): Promise<string> {
  const existing = await findTaxRateId(stripe, percent);
  if (existing) return existing;

  const created = await stripe.taxRates.create({
    display_name: "IVA",
    description: percent === VAT_ACCOMMODATION_PERCENT ? "IVA 6% (alojamento)" : "IVA 23%",
    inclusive: true,
    percentage: percent,
    country: "PT",
    metadata: { [TAX_VAT_META]: String(percent) },
  });
  return created.id;
}

async function findProductId(stripe: Stripe, sku: string): Promise<string | null> {
  for await (const product of stripe.products.list({ limit: 100, active: true })) {
    if (product.metadata?.[PRODUCT_SKU_META] === sku) return product.id;
  }
  return null;
}

function productPayload(article: MoloniArticle) {
  return {
    name: article.name,
    description: formatVatDescription(article.unitAmountCents, article.vatPercent),
    metadata: {
      [PRODUCT_SKU_META]: article.sku,
      vat_percent: String(article.vatPercent),
      unit_amount_cents: String(article.unitAmountCents),
    },
  };
}

async function ensureProduct(stripe: Stripe, article: MoloniArticle): Promise<string> {
  const existingId = await findProductId(stripe, article.sku);
  const payload = productPayload(article);
  if (existingId) {
    await stripe.products.update(existingId, payload);
    return existingId;
  }
  const created = await stripe.products.create(payload);
  return created.id;
}

export async function ensureMoloniStripeCatalog(stripe: Stripe): Promise<MoloniStripeCatalog> {
  if (catalogCache) return catalogCache;

  const [tax6, tax23] = await Promise.all([
    ensureTaxRate(stripe, VAT_ACCOMMODATION_PERCENT),
    ensureTaxRate(stripe, VAT_STANDARD_PERCENT),
  ]);

  const productsBySku: Record<string, string> = {};
  for (const article of MOLONI_ARTICLE_LIST) {
    productsBySku[article.sku] = await ensureProduct(stripe, article);
  }

  catalogCache = {
    productsBySku,
    taxRateByPercent: {
      [VAT_ACCOMMODATION_PERCENT]: tax6,
      [VAT_STANDARD_PERCENT]: tax23,
    },
  };
  return catalogCache;
}

export async function toStripeCheckoutLineItems(
  stripe: Stripe,
  lines: AccountingLine[]
): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  const catalog = await ensureMoloniStripeCatalog(stripe);

  return lines
    .filter((line) => line.quantity > 0 && line.unitAmountCents > 0)
    .map((line) => {
      const productId = catalog.productsBySku[line.sku];
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
        currency: "eur",
        unit_amount: line.unitAmountCents,
        tax_behavior: "inclusive",
        ...(productId
          ? { product: productId }
          : {
              product_data: {
                name: line.name,
                description: line.description,
                metadata: { [PRODUCT_SKU_META]: line.sku },
              },
            }),
      };

      return {
        quantity: line.quantity,
        price_data: priceData,
        tax_rates: [catalog.taxRateByPercent[line.vatPercent]],
      };
    });
}

export function linesMatchAmount(lines: AccountingLine[] | undefined, amountCents: number): boolean {
  if (!lines?.length) return false;
  const total = lines.reduce((sum, line) => sum + line.unitAmountCents * line.quantity, 0);
  return total === amountCents;
}
