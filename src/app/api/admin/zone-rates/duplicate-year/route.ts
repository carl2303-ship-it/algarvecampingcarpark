import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const duplicateSchema = z.object({
  source_year: z.number().int().min(2000).max(2100),
  target_year: z.number().int().min(2000).max(2100),
});

function shiftDateYear(date: string, yearOffset: number): string {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));
  const shifted = new Date(Date.UTC(year + yearOffset, month - 1, day));
  return shifted.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { source_year, target_year } = duplicateSchema.parse(await request.json());
  if (source_year === target_year) {
    return NextResponse.json({ error: "Les années source et cible doivent être différentes." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const sourceStart = `${source_year}-01-01`;
  const sourceEnd = `${source_year}-12-31`;
  const targetStart = `${target_year}-01-01`;
  const targetEnd = `${target_year}-12-31`;

  const { data: existingTargetRates, error: targetError } = await supabase
    .from("zone_rates")
    .select("id")
    .gte("start_date", targetStart)
    .lte("start_date", targetEnd)
    .limit(1);

  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });
  if ((existingTargetRates ?? []).length > 0) {
    return NextResponse.json(
      { error: "Des tarifs existent déjà pour l'année cible. Supprimez-les d'abord." },
      { status: 400 }
    );
  }

  const { data: sourceRates, error: sourceError } = await supabase
    .from("zone_rates")
    .select("zone_id, start_date, end_date, price_cents_per_night, price_cents_3_4_guests, min_nights, season")
    .gte("start_date", sourceStart)
    .lte("start_date", sourceEnd)
    .order("start_date");

  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
  if (!sourceRates || sourceRates.length === 0) {
    return NextResponse.json({ error: "Aucun tarif trouvé pour l'année source." }, { status: 400 });
  }

  const yearOffset = target_year - source_year;
  const payload = sourceRates.map((rate) => ({
    zone_id: rate.zone_id,
    start_date: shiftDateYear(rate.start_date, yearOffset),
    end_date: shiftDateYear(rate.end_date, yearOffset),
    price_cents_per_night: rate.price_cents_per_night,
    price_cents_3_4_guests: rate.price_cents_3_4_guests,
    min_nights: rate.min_nights,
    season: rate.season,
  }));

  const { error: insertError } = await supabase.from("zone_rates").insert(payload);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    inserted_count: payload.length,
    source_year,
    target_year,
  });
}
