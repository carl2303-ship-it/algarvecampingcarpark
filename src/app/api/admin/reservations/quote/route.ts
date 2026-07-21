import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { getZoneRates } from "@/lib/availability";
import { calculateTotalPrice } from "@/lib/pricing";
import { getPricingSupplements } from "@/lib/pricing-supplements";

export const dynamic = "force-dynamic";

const quoteSchema = z.object({
  zone_id: z.string().uuid(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  num_guests: z.coerce.number().int().min(1).max(10).default(2),
  over_9m: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === "true" || value === "1";
    }),
  electricity_amperage: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(6), z.literal(10)]))
    .optional(),
  manual_supplement_ids: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = quoteSchema.safeParse({
    zone_id: searchParams.get("zone_id"),
    check_in: searchParams.get("check_in"),
    check_out: searchParams.get("check_out"),
    num_guests: searchParams.get("num_guests") ?? 2,
    over_9m: searchParams.get("over_9m") ?? undefined,
    electricity_amperage: searchParams.get("electricity_amperage") ?? undefined,
    manual_supplement_ids: searchParams.get("manual_supplement_ids") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const {
      zone_id,
      check_in,
      check_out,
      num_guests,
      over_9m,
      electricity_amperage,
      manual_supplement_ids,
    } = parsed.data;
    const manualSupplementIds = manual_supplement_ids
      ? manual_supplement_ids.split(",").filter(Boolean)
      : [];
    const rates = await getZoneRates(zone_id);
    const supplements = await getPricingSupplements();
    const pricing = calculateTotalPrice(rates, check_in, check_out, num_guests, {
      motorhomeOver9m: over_9m,
      electricityAmperage: electricity_amperage ?? null,
      manualSupplementIds,
      supplements,
    });
    return NextResponse.json({ pricing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular preço";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
