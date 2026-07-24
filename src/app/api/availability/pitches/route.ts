import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveZones, getAvailablePitchesForZone } from "@/lib/availability";
import { isPricingZoneSlug, type PricingZoneSlug } from "@/lib/park-pitch-map-defaults";
import { getPublicPricingSupplements } from "@/lib/pricing-supplements";
import { getParkSettings, isOnlineBookingOpen } from "@/lib/park-settings";
import { bookingChargeCents } from "@/lib/booking-deposit";
import { isPublicEntryRequest } from "@/lib/gate-entry";

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
  electricity_amperage: z.coerce.number().int().pipe(z.union([z.literal(6), z.literal(10)])).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deskEntry = isPublicEntryRequest(searchParams);
  const gateEntry = searchParams.get("gate_entry") === "1";
  const parkSettings = await getParkSettings();

  if (!isOnlineBookingOpen(parkSettings) && !deskEntry) {
    return NextResponse.json(
      { error: "As reservas online estão temporariamente indisponíveis." },
      { status: 503 }
    );
  }

  try {
    const parsed = querySchema.parse({
      check_in: searchParams.get("check_in"),
      check_out: searchParams.get("check_out"),
      zone_id: searchParams.get("zone_id"),
      num_guests: searchParams.get("num_guests") ?? 2,
      electric: searchParams.get("electric") ?? undefined,
      over_9m: searchParams.get("over_9m") ?? undefined,
      electricity_amperage: searchParams.get("electricity_amperage") ?? undefined,
    });

    if (parsed.check_out <= parsed.check_in) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
    }

    const zones = await getActiveZones();
    const zone = zones.find((z) => z.id === parsed.zone_id);
    if (!zone || !isPricingZoneSlug(zone.slug)) {
      return NextResponse.json({ error: "Zona inválida" }, { status: 400 });
    }

    const supplements = await getPublicPricingSupplements();

    const result = await getAvailablePitchesForZone({
      zoneId: zone.id,
      zoneSlug: zone.slug as PricingZoneSlug,
      checkIn: parsed.check_in,
      checkOut: parsed.check_out,
      numGuests: parsed.num_guests,
      electric: parsed.electric,
      over9m: parsed.over_9m,
      electricityAmperage:
        parsed.electric === false ? null : (parsed.electricity_amperage ?? 6),
      supplements,
    });

    const depositCents = bookingChargeCents(result.pricing.totalCents, {
      checkIn: parsed.check_in,
      gateEntry,
      checkInTime: parkSettings.check_in_time,
    });

    return NextResponse.json({
      zone,
      total_price_cents: result.pricing.totalCents,
      deposit_cents: depositCents,
      full_payment: depositCents >= result.pricing.totalCents,
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
