import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import { DEFAULT_PITCH_MAP, type PitchMapSpot } from "@/lib/park-pitch-map-defaults";

export type PitchMapSpotRecord = PitchMapSpot & {
  sort_order: number;
};

const SPOT_COLUMNS =
  "code, x, y, panoramic, electric, over_9m, sort_order, image_url, width_m, length_m, zone_slug, electricity_distance_m, category, max_amperage, status";

function toSpot(row: {
  code: string;
  x: number | string;
  y: number | string;
  panoramic: boolean;
  electric: boolean;
  over_9m?: boolean;
  sort_order: number;
  image_url?: string | null;
  width_m?: number | string | null;
  length_m?: number | string | null;
  zone_slug?: string | null;
  electricity_distance_m?: number | string | null;
  category?: string | null;
  max_amperage?: number;
  status?: "available" | "occupied" | "maintenance";
}): PitchMapSpotRecord {
  return {
    code: row.code,
    x: Number(row.x),
    y: Number(row.y),
    panoramic: row.panoramic,
    electric: row.electric,
    over_9m: Boolean(row.over_9m),
    sort_order: row.sort_order,
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
}

export async function getPitchMapSpots(): Promise<PitchMapSpot[]> {
  if (!getPublicSupabaseConfig()) {
    return DEFAULT_PITCH_MAP;
  }

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("pitch_map_spots")
    .select(SPOT_COLUMNS)
    .order("sort_order");

  if (error || !data?.length) {
    console.warn("Pitch map fetch error:", error?.message);
    return DEFAULT_PITCH_MAP;
  }

  return data.map(toSpot);
}

export async function getPitchMapSpotByCode(code: string): Promise<PitchMapSpot | null> {
  const spots = await getPitchMapSpots();
  return spots.find((spot) => spot.code === code) ?? null;
}

export async function getPitchMapSpotsAdmin(): Promise<PitchMapSpotRecord[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pitch_map_spots")
    .select(SPOT_COLUMNS)
    .order("sort_order");

  if (error) throw error;
  if (!data?.length) return DEFAULT_PITCH_MAP.map((spot, index) => ({ ...spot, sort_order: index + 1 }));
  return data.map(toSpot);
}
