import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZoneRates } from "@/lib/availability";
import { calculateTotalPrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const quoteSchema = z.object({
  zone_id: z.string().uuid(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  num_guests: z.coerce.number().int().min(1).max(10).default(2),
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
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const { zone_id, check_in, check_out, num_guests } = parsed.data;
    const rates = await getZoneRates(zone_id);
    const pricing = calculateTotalPrice(rates, check_in, check_out, num_guests);
    return NextResponse.json({ pricing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular preço";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
