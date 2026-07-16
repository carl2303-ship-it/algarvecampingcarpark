import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import type { Locale } from "@/lib/constants";
import { bcp47Locale } from "@/lib/locale-format";
import type { Zone, ZoneRate } from "@/types/database";

import type { ServiceItem } from "@/types/database";

export type { ServiceItem };

export interface PricingCatalog {
  zones: Zone[];
  rates: ZoneRate[];
  services: ServiceItem[];
}

export const EMPTY_PRICING_CATALOG: PricingCatalog = {
  zones: [],
  rates: [],
  services: [],
};

export async function getPricingCatalog(options?: {
  required?: boolean;
}): Promise<PricingCatalog> {
  const required = options?.required ?? false;

  if (!getPublicSupabaseConfig()) {
    if (required) throw new Error("Supabase public credentials are not configured");
    return EMPTY_PRICING_CATALOG;
  }

  const supabase = createPublicServerClient();

  const [zonesRes, ratesRes, servicesRes] = await Promise.all([
    supabase.from("zones").select("*").eq("active", true).order("sort_order"),
    supabase.from("zone_rates").select("*").order("start_date"),
    supabase.from("service_items").select("*").eq("active", true).order("sort_order"),
  ]);

  if (zonesRes.error || ratesRes.error || servicesRes.error) {
    const error = zonesRes.error ?? ratesRes.error ?? servicesRes.error;
    if (required) throw error;
    console.warn("Pricing catalog fallback:", error?.message);
    return EMPTY_PRICING_CATALOG;
  }

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
): { august: SeasonRates; summer: SeasonRates; low: SeasonRates } {
  const august: SeasonRates = [];
  const summer: SeasonRates = [];
  const low: SeasonRates = [];

  for (const zone of zones) {
    const zoneRates = rates.filter((r) => r.zone_id === zone.id);
    for (const rate of zoneRates) {
      const entry: ZoneRateEntry = { zone, rate };
      if (rate.season === "august") august.push(entry);
      else if (rate.season === "summer") summer.push(entry);
      else low.push(entry);
    }
  }

  return { august, summer, low };
}

export interface ZoneRateEntry {
  zone: Zone;
  rate: ZoneRate;
}

export type SeasonRates = ZoneRateEntry[];

export function formatRatePeriod(start: string, end: string, locale: Locale): string {
  const fmt = new Intl.DateTimeFormat(bcp47Locale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} — ${fmt.format(new Date(end))}`;
}
