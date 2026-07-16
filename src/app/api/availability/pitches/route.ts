import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveZones, getAvailablePitchesForZone } from "@/lib/availability";
import { isPricingZoneSlug, type PricingZoneSlug } from "@/lib/park-pitch-map-defaults";
import { isOnlineBookingCurrentlyOpen } from "@/lib/park-settings";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  zone_id: z.string().uuid(),
  num_guests: z.coerce.number().int().min(1).max(10).default(2),
  electric: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === "true" || value === "1";
    }),
  over_9m: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === "true" || value === "1";
    }),
});

export async function GET(request: Request) {
  if (!(await isOnlineBookingCurrentlyOpen())) {
    return NextResponse.json(
      { error: "As reservas online estão temporariamente indisponíveis." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      check_in: searchParams.get("check_in"),
      check_out: searchParams.get("check_out"),
      zone_id: searchParams.get("zone_id"),
      num_guests: searchParams.get("num_guests") ?? 2,
      electric: searchParams.get("electric") ?? undefined,
      over_9m: searchParams.get("over_9m") ?? undefined,
    });

    if (parsed.check_out <= parsed.check_in) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
    }

    const zones = await getActiveZones();
    const zone = zones.find((z) => z.id === parsed.zone_id);
    if (!zone || !isPricingZoneSlug(zone.slug)) {
      return NextResponse.json({ error: "Zona inválida" }, { status: 400 });
    }

    const result = await getAvailablePitchesForZone({
      zoneId: zone.id,
      zoneSlug: zone.slug as PricingZoneSlug,
      checkIn: parsed.check_in,
      checkOut: parsed.check_out,
      numGuests: parsed.num_guests,
      electric: parsed.electric,
      over9m: parsed.over_9m,
    });

    return NextResponse.json({
      zone,
      total_price_cents: result.pricing.totalCents,
      deposit_cents: Math.round(result.pricing.totalCents * 0.5),
      nights: result.pricing.nights,
      price_per_night_cents: result.pricing.pricePerNightCents,
      min_nights: result.pricing.minNights,
      pitches: result.pitches,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Pitch availability error:", error);
    return NextResponse.json({ error: "Erro ao verificar lugares" }, { status: 500 });
  }
}
