import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { MOLONI_ARTICLE_LIST, formatVatDescription } from "@/lib/moloni-articles";
import { ensureMoloniStripeCatalog, resetMoloniStripeCatalogCache } from "@/lib/stripe-moloni";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    articles: MOLONI_ARTICLE_LIST.map((article) => ({
      sku: article.sku,
      name: article.name,
      vat_percent: article.vatPercent,
      unit_amount_cents: article.unitAmountCents,
      vat_description: formatVatDescription(article.unitAmountCents, article.vatPercent),
    })),
  });
}

export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    resetMoloniStripeCatalogCache();
    const stripe = await getStripe();
    const catalog = await ensureMoloniStripeCatalog(stripe);
    return NextResponse.json({
      ok: true,
      products: catalog.productsBySku,
      tax_rates: catalog.taxRateByPercent,
      articles: MOLONI_ARTICLE_LIST.map((article) => ({
        sku: article.sku,
        name: article.name,
        vat_percent: article.vatPercent,
        unit_amount_cents: article.unitAmountCents,
        stripe_product_id: catalog.productsBySku[article.sku] ?? null,
        vat_description: formatVatDescription(article.unitAmountCents, article.vatPercent),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao sincronizar artigos Stripe";
    console.error("Stripe Moloni sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
