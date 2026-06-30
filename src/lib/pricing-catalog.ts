import { createAdminClient } from "@/lib/supabase/admin";
import type { Zone, ZoneRate } from "@/types/database";

import type { ServiceItem } from "@/types/database";

export type { ServiceItem };

export interface PricingCatalog {
  zones: Zone[];
  rates: ZoneRate[];
  services: ServiceItem[];
}

export async function getPricingCatalog(): Promise<PricingCatalog> {
  const supabase = createAdminClient();

  const [zonesRes, ratesRes, servicesRes] = await Promise.all([
    supabase.from("zones").select("*").eq("active", true).order("sort_order"),
    supabase.from("zone_rates").select("*").order("start_date"),
    supabase.from("service_items").select("*").eq("active", true).order("sort_order"),
  ]);

  if (zonesRes.error) throw zonesRes.error;
  if (ratesRes.error) throw ratesRes.error;
  if (servicesRes.error) throw servicesRes.error;

  return {
    zones: (zonesRes.data ?? []).map((z) => ({
      ...z,
      amenities: Array.isArray(z.amenities) ? z.amenities : [],
    })),
    rates: ratesRes.data ?? [],
    services: servicesRes.data ?? [],
  };
}

export function groupRatesBySeason(
  zones: Zone[],
  rates: ZoneRate[]
): { summer: SeasonRates; winter: SeasonRates } {
  const summer: SeasonRates = [];
  const winter: SeasonRates = [];

  for (const zone of zones) {
    const zoneRates = rates.filter((r) => r.zone_id === zone.id);
    for (const rate of zoneRates) {
      const entry: ZoneRateEntry = { zone, rate };
      const season = rate.season;
      if (season === "summer") summer.push(entry);
      else winter.push(entry);
    }
  }

  return { summer, winter };
}

export interface ZoneRateEntry {
  zone: Zone;
  rate: ZoneRate;
}

export type SeasonRates = ZoneRateEntry[];

export function formatRatePeriod(start: string, end: string, locale: "pt" | "en"): string {
  const fmt = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} — ${fmt.format(new Date(end))}`;
}
