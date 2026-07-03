import { createAdminClient } from "@/lib/supabase/admin";
import { calculateTotalPrice } from "@/lib/pricing";
import type { Zone, ZoneAvailability, ZoneRate } from "@/types/database";

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
  numGuests = 2
): Promise<ZoneAvailability[]> {
  const supabase = createAdminClient();

  await supabase.rpc("expire_pending_reservations");

  const zones = await getActiveZones();
  const results: ZoneAvailability[] = [];

  for (const zone of zones) {
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
      const pricing = calculateTotalPrice(rates, checkIn, checkOut, numGuests);
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
  numGuests = 2
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
  const pricing = calculateTotalPrice(rates, checkIn, checkOut, numGuests);

  if (pricing.nights < pricing.minNights) {
    return { available: false, pricing };
  }

  return { available: true, pricing };
}
