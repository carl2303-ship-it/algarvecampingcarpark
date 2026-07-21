import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import type { ElectricityAmperage } from "@/lib/pricing";

export type PricingSupplementTrigger =
  | "extra_guest"
  | "motorhome_over_9m"
  | "electricity_10a"
  | "manual_per_night";

export interface PricingSupplement {
  id: string;
  slug: string | null;
  name_pt: string;
  name_en: string | null;
  description_pt: string | null;
  description_en: string | null;
  amount_cents_per_night: number;
  trigger_type: PricingSupplementTrigger;
  trigger_config: Record<string, unknown>;
  applies_online: boolean;
  applies_admin: boolean;
  is_system: boolean;
  active: boolean;
  sort_order: number;
}

export type PricingContext = {
  numGuests: number;
  motorhomeOver9m?: boolean;
  electricityAmperage?: ElectricityAmperage | null;
  manualSupplementIds?: string[];
};

const FALLBACK_SUPPLEMENTS: PricingSupplement[] = [
  {
    id: "fallback-extra-guest",
    slug: "extra_guest",
    name_pt: "Pessoa extra (a partir da 5ª)",
    name_en: "Extra guest (from 5th)",
    description_pt: null,
    description_en: null,
    amount_cents_per_night: 150,
    trigger_type: "extra_guest",
    trigger_config: { guest_threshold: 4 },
    applies_online: true,
    applies_admin: true,
    is_system: true,
    active: true,
    sort_order: 1,
  },
  {
    id: "fallback-motorhome-over-9m",
    slug: "motorhome_over_9m",
    name_pt: "Camping-car +9 m",
    name_en: "Motorhome +9 m",
    description_pt: null,
    description_en: null,
    amount_cents_per_night: 200,
    trigger_type: "motorhome_over_9m",
    trigger_config: {},
    applies_online: true,
    applies_admin: true,
    is_system: true,
    active: true,
    sort_order: 2,
  },
  {
    id: "fallback-electricity-10a",
    slug: "electricity_10a",
    name_pt: "Eletricidade 10A",
    name_en: "10A electricity",
    description_pt: null,
    description_en: null,
    amount_cents_per_night: 50,
    trigger_type: "electricity_10a",
    trigger_config: {},
    applies_online: true,
    applies_admin: true,
    is_system: true,
    active: true,
    sort_order: 3,
  },
];

function normalizeSupplement(row: Record<string, unknown>): PricingSupplement {
  return {
    id: String(row.id),
    slug: row.slug != null ? String(row.slug) : null,
    name_pt: String(row.name_pt),
    name_en: row.name_en != null ? String(row.name_en) : null,
    description_pt: row.description_pt != null ? String(row.description_pt) : null,
    description_en: row.description_en != null ? String(row.description_en) : null,
    amount_cents_per_night: Number(row.amount_cents_per_night ?? 0),
    trigger_type: row.trigger_type as PricingSupplementTrigger,
    trigger_config:
      row.trigger_config && typeof row.trigger_config === "object"
        ? (row.trigger_config as Record<string, unknown>)
        : {},
    applies_online: Boolean(row.applies_online),
    applies_admin: Boolean(row.applies_admin),
    is_system: Boolean(row.is_system),
    active: Boolean(row.active),
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function getExtraGuestSupplement(supplements: PricingSupplement[]): PricingSupplement | null {
  return supplements.find((item) => item.slug === "extra_guest" && item.active) ?? null;
}

export function getManualSupplements(supplements: PricingSupplement[]): PricingSupplement[] {
  return supplements.filter((item) => item.trigger_type === "manual_per_night" && item.active);
}

export function computeSupplementsCentsPerNight(
  supplements: PricingSupplement[],
  context: PricingContext
): number {
  const manualIds = new Set(context.manualSupplementIds ?? []);
  let total = 0;

  for (const supplement of supplements) {
    if (!supplement.active) continue;

    switch (supplement.trigger_type) {
      case "motorhome_over_9m":
        if (context.motorhomeOver9m) total += supplement.amount_cents_per_night;
        break;
      case "electricity_10a":
        if (context.electricityAmperage === 10) total += supplement.amount_cents_per_night;
        break;
      case "manual_per_night":
        if (manualIds.has(supplement.id)) total += supplement.amount_cents_per_night;
        break;
      case "extra_guest":
        break;
    }
  }

  return total;
}

export async function getPricingSupplements(options?: {
  includeInactive?: boolean;
}): Promise<PricingSupplement[]> {
  if (!getPublicSupabaseConfig()) {
    return FALLBACK_SUPPLEMENTS;
  }

  try {
    const supabase = createAdminClient();
    let query = supabase.from("pricing_supplements").select("*").order("sort_order");
    if (!options?.includeInactive) {
      query = query.eq("active", true);
    }
    const { data, error } = await query;
    if (error || !data?.length) {
      if (error) console.warn("Pricing supplements fetch error:", error.message);
      return FALLBACK_SUPPLEMENTS;
    }
    return data.map((row) => normalizeSupplement(row as Record<string, unknown>));
  } catch (error) {
    console.warn("Pricing supplements unavailable:", error);
    return FALLBACK_SUPPLEMENTS;
  }
}

export async function getPublicPricingSupplements(): Promise<PricingSupplement[]> {
  if (!getPublicSupabaseConfig()) {
    return FALLBACK_SUPPLEMENTS.filter((item) => item.applies_online);
  }

  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("pricing_supplements")
      .select("*")
      .eq("active", true)
      .order("sort_order");

    if (error || !data?.length) {
      if (error) console.warn("Public pricing supplements fetch error:", error.message);
      return FALLBACK_SUPPLEMENTS.filter((item) => item.applies_online);
    }

    return data
      .map((row) => normalizeSupplement(row as Record<string, unknown>))
      .filter((item) => item.applies_online);
  } catch (error) {
    console.warn("Public pricing supplements unavailable:", error);
    return FALLBACK_SUPPLEMENTS.filter((item) => item.applies_online);
  }
}
