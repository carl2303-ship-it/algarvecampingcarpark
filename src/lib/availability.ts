import { createAdminClient } from "@/lib/supabase/admin";
import { calculateTotalPrice, type PricingOptions } from "@/lib/pricing";
import {
  getSpotZoneSlug,
  isPricingZoneSlug,
  spotIsOver9m,
  type PitchMapSpot,
  type PricingZoneSlug,
} from "@/lib/park-pitch-map-defaults";
import type { Zone, ZoneAvailability, ZoneRate } from "@/types/database";

const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed", "checked_in"] as const;

export type AvailablePitch = PitchMapSpot & {
  zone_id: string;
  zone_slug: PricingZoneSlug;
};

export async function getActiveZones(): Promise<Zone[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("zones")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []).map((z) => ({
    ...z,
    amenities: Array.isArray(z.amenities) ? z.amenities : [],
  }));
}

export async function getZoneRates(zoneId: string): Promise<ZoneRate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("zone_rates")
    .select("*")
    .eq("zone_id", zoneId)
    .order("start_date");

  if (error) throw error;
  return data ?? [];
}

export async function getZoneAvailability(
  checkIn: string,
  checkOut: string,
  numGuests = 2,
  pricingOptions?: PricingOptions
): Promise<ZoneAvailability[]> {
  const supabase = createAdminClient();

  await supabase.rpc("expire_pending_reservations");

  const zones = await getActiveZones();
  const results: ZoneAvailability[] = [];

  for (const zone of zones) {
    // +9 m is a pitch attribute, not a tariff — skip legacy pricing zones
    if (!isPricingZoneSlug(zone.slug)) continue;

    const { data: availableSpots, error } = await supabase.rpc(
      "get_zone_availability",
      {
        p_zone_id: zone.id,
        p_check_in: checkIn,
        p_check_out: checkOut,
      }
    );

    if (error) throw error;
    if (!availableSpots || availableSpots <= 0) continue;

    const rates = await getZoneRates(zone.id);

    try {
      const pricing = calculateTotalPrice(rates, checkIn, checkOut, numGuests, pricingOptions);
      if (pricing.nights < pricing.minNights) continue;

      results.push({
        zone,
        available_spots: availableSpots,
        total_price_cents: pricing.totalCents,
        nights: pricing.nights,
        price_per_night_cents: pricing.pricePerNightCents,
        min_nights: pricing.minNights,
      });
    } catch {
      continue;
    }
  }

  return results;
}

export async function validateBookingAvailability(
  zoneId: string,
  checkIn: string,
  checkOut: string,
  numGuests = 2,
  pricingOptions?: PricingOptions
): Promise<{ available: boolean; pricing: ReturnType<typeof calculateTotalPrice> }> {
  const supabase = createAdminClient();

  await supabase.rpc("expire_pending_reservations");

  const { data: availableSpots, error } = await supabase.rpc(
    "get_zone_availability",
    { p_zone_id: zoneId, p_check_in: checkIn, p_check_out: checkOut }
  );

  if (error) throw error;
  if (!availableSpots || availableSpots <= 0) {
    return { available: false, pricing: { totalCents: 0, nights: 0, minNights: 1, pricePerNightCents: 0 } };
  }

  const rates = await getZoneRates(zoneId);
  const pricing = calculateTotalPrice(rates, checkIn, checkOut, numGuests, pricingOptions);

  if (pricing.nights < pricing.minNights) {
    return { available: false, pricing };
  }

  return { available: true, pricing };
}

export async function getOccupiedPitchCodes(
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<Set<string>> {
  const supabase = createAdminClient();
  await supabase.rpc("expire_pending_reservations");

  const occupied = new Set<string>();

  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("id, pitch_code, check_in, check_out, status")
    .in("status", [...ACTIVE_BOOKING_STATUSES])
    .not("pitch_code", "is", null)
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  if (resError) throw resError;

  for (const row of reservations ?? []) {
    if (excludeReservationId && row.id === excludeReservationId) continue;
    if (row.pitch_code) occupied.add(String(row.pitch_code).toUpperCase());
  }

  const { data: blocked, error: blockError } = await supabase
    .from("blocked_dates")
    .select("pitch_code, start_date, end_date")
    .not("pitch_code", "is", null)
    .lt("start_date", checkOut)
    .gt("end_date", checkIn);

  if (blockError) throw blockError;

  for (const row of blocked ?? []) {
    if (row.pitch_code) occupied.add(String(row.pitch_code).toUpperCase());
  }

  return occupied;
}

export async function findPitchOverlapConflict(params: {
  pitchCode: string;
  checkIn: string;
  checkOut: string;
  excludeReservationId?: string;
}): Promise<{ id: string; guest_name: string; check_in: string; check_out: string } | null> {
  const supabase = createAdminClient();
  const code = params.pitchCode.toUpperCase();

  const { data, error } = await supabase
    .from("reservations")
    .select("id, guest_name, check_in, check_out, pitch_code, status")
    .eq("pitch_code", code)
    .in("status", [...ACTIVE_BOOKING_STATUSES])
    .lt("check_in", params.checkOut)
    .gt("check_out", params.checkIn)
    .order("check_in", { ascending: true })
    .limit(5);

  if (error) throw error;

  const conflict = (data ?? []).find((row) =>
    params.excludeReservationId ? row.id !== params.excludeReservationId : true
  );

  return conflict
    ? {
        id: conflict.id,
        guest_name: conflict.guest_name,
        check_in: conflict.check_in,
        check_out: conflict.check_out,
      }
    : null;
}

export async function getAvailablePitchesForZone(params: {
  zoneId: string;
  zoneSlug: PricingZoneSlug;
  checkIn: string;
  checkOut: string;
  numGuests?: number;
  /** When set, only pitches with this electricity flag are returned. */
  electric?: boolean;
  /** When set, only +9 m (or not) pitches are returned. */
  over9m?: boolean;
  /** Hook-up intensity when electric pitches are requested (6A or 10A). */
  electricityAmperage?: PricingOptions["electricityAmperage"];
  manualSupplementIds?: string[];
  supplements?: PricingOptions["supplements"];
}): Promise<{
  available: boolean;
  pricing: ReturnType<typeof calculateTotalPrice>;
  pitches: AvailablePitch[];
}> {
  const pricingOptions: PricingOptions = {
    motorhomeOver9m: params.over9m,
    electricityAmperage: params.electricityAmperage,
    manualSupplementIds: params.manualSupplementIds,
    supplements: params.supplements,
  };

  const { available, pricing } = await validateBookingAvailability(
    params.zoneId,
    params.checkIn,
    params.checkOut,
    params.numGuests ?? 2,
    pricingOptions
  );

  if (!available) {
    return { available: false, pricing, pitches: [] };
  }

  const supabase = createAdminClient();
  const { data: spots, error } = await supabase
    .from("pitch_map_spots")
    .select(
      "code, x, y, panoramic, electric, over_9m, image_url, width_m, length_m, zone_slug, electricity_distance_m, category, max_amperage, status, sort_order"
    )
    .order("sort_order");

  if (error) throw error;

  const occupied = await getOccupiedPitchCodes(params.checkIn, params.checkOut);

  const pitches: AvailablePitch[] = (spots ?? [])
    .map((row) => {
      const spot: PitchMapSpot = {
        code: row.code,
        x: Number(row.x),
        y: Number(row.y),
        panoramic: Boolean(row.panoramic),
        electric: Boolean(row.electric),
        over_9m: Boolean(row.over_9m),
        image_url: row.image_url ?? null,
        width_m: row.width_m != null ? Number(row.width_m) : null,
        length_m: row.length_m != null ? Number(row.length_m) : null,
        zone_slug: row.zone_slug ?? null,
        electricity_distance_m:
          row.electricity_distance_m != null ? Number(row.electricity_distance_m) : null,
        category: row.category ?? null,
        max_amperage: row.max_amperage != null ? Number(row.max_amperage) : undefined,
        status: row.status ?? "available",
      };
      return {
        ...spot,
        zone_id: params.zoneId,
        zone_slug: getSpotZoneSlug(spot),
      };
    })
    .filter((spot) => {
      if (spot.zone_slug !== params.zoneSlug) return false;
      if (spot.status === "maintenance") return false;
      if (occupied.has(spot.code.toUpperCase())) return false;
      if (params.electric !== undefined && spot.electric !== params.electric) return false;
      if (params.over9m !== undefined && spotIsOver9m(spot) !== params.over9m) {
        return false;
      }
      if (params.electricityAmperage != null && spot.electric) {
        const maxAmps = spot.max_amperage ?? 16;
        if (maxAmps < params.electricityAmperage) return false;
      }
      return true;
    });

  return {
    available: pitches.length > 0,
    pricing,
    pitches,
  };
}

export async function validatePitchBookingAvailability(params: {
  zoneId: string;
  pitchCode: string;
  checkIn: string;
  checkOut: string;
  numGuests?: number;
  electric?: boolean;
  over9m?: boolean;
  electricityAmperage?: PricingOptions["electricityAmperage"];
  manualSupplementIds?: string[];
  supplements?: PricingOptions["supplements"];
}): Promise<{
  available: boolean;
  pricing: ReturnType<typeof calculateTotalPrice>;
  pitch: AvailablePitch | null;
  zone: Zone | null;
}> {
  const supabase = createAdminClient();
  const code = params.pitchCode.toUpperCase();

  const { data: zone, error: zoneError } = await supabase
    .from("zones")
    .select("*")
    .eq("id", params.zoneId)
    .eq("active", true)
    .maybeSingle();

  if (zoneError) throw zoneError;
  if (!zone) {
    return {
      available: false,
      pricing: { totalCents: 0, nights: 0, minNights: 1, pricePerNightCents: 0 },
      pitch: null,
      zone: null,
    };
  }

  if (!isPricingZoneSlug(zone.slug)) {
    return {
      available: false,
      pricing: { totalCents: 0, nights: 0, minNights: 1, pricePerNightCents: 0 },
      pitch: null,
      zone: null,
    };
  }

  const { available, pricing, pitches } = await getAvailablePitchesForZone({
    zoneId: params.zoneId,
    zoneSlug: zone.slug,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    numGuests: params.numGuests,
    electric: params.electric,
    over9m: params.over9m,
    electricityAmperage: params.electricityAmperage,
    manualSupplementIds: params.manualSupplementIds,
    supplements: params.supplements,
  });

  const pitch = pitches.find((p) => p.code.toUpperCase() === code) ?? null;

  return {
    available: available && Boolean(pitch),
    pricing,
    pitch,
    zone: {
      ...zone,
      amenities: Array.isArray(zone.amenities) ? zone.amenities : [],
    },
  };
}
