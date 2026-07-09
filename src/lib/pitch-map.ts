import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import { DEFAULT_PITCH_MAP, type PitchMapSpot } from "@/lib/park-pitch-map-defaults";

export type PitchMapSpotRecord = PitchMapSpot & {
  sort_order: number;
};

function toSpot(row: {
  code: string;
  x: number | string;
  y: number | string;
  panoramic: boolean;
  electric: boolean;
  sort_order: number;
}): PitchMapSpotRecord {
  return {
    code: row.code,
    x: Number(row.x),
    y: Number(row.y),
    panoramic: row.panoramic,
    electric: row.electric,
    sort_order: row.sort_order,
  };
}

export async function getPitchMapSpots(): Promise<PitchMapSpot[]> {
  if (!getPublicSupabaseConfig()) {
    return DEFAULT_PITCH_MAP;
  }

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("pitch_map_spots")
    .select("code, x, y, panoramic, electric, sort_order")
    .order("sort_order");

  if (error || !data?.length) {
    console.warn("Pitch map fetch error:", error?.message);
    return DEFAULT_PITCH_MAP;
  }

  return data.map(toSpot);
}

export async function getPitchMapSpotsAdmin(): Promise<PitchMapSpotRecord[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pitch_map_spots")
    .select("code, x, y, panoramic, electric, sort_order")
    .order("sort_order");

  if (error) throw error;
  if (!data?.length) return DEFAULT_PITCH_MAP.map((spot, index) => ({ ...spot, sort_order: index + 1 }));
  return data.map(toSpot);
}
