import { NextResponse } from "next/server";
import { getPricingCatalog } from "@/lib/pricing-catalog";

export const revalidate = 60;

export async function GET() {
  try {
    const catalog = await getPricingCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error("Pricing catalog error:", error);
    return NextResponse.json({ error: "Erro ao carregar preçário" }, { status: 500 });
  }
}
