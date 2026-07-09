import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import { DEFAULT_PARK_SETTINGS, type ParkSettings } from "@/lib/constants";

export type { ParkSettings };

function normalizeSettings(row: Partial<ParkSettings> | null): ParkSettings {
  return {
    reception_open: row?.reception_open ?? DEFAULT_PARK_SETTINGS.reception_open,
    reception_close: row?.reception_close ?? DEFAULT_PARK_SETTINGS.reception_close,
    check_in_time: row?.check_in_time ?? DEFAULT_PARK_SETTINGS.check_in_time,
    check_out_time: row?.check_out_time ?? DEFAULT_PARK_SETTINGS.check_out_time,
  };
}

export async function getParkSettings(): Promise<ParkSettings> {
  if (!getPublicSupabaseConfig()) {
    return DEFAULT_PARK_SETTINGS;
  }

  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("park_settings")
      .select("reception_open, reception_close, check_in_time, check_out_time")
      .eq("id", true)
      .maybeSingle();

    if (error || !data) {
      console.warn("Park settings fetch error:", error?.message);
      return DEFAULT_PARK_SETTINGS;
    }

    return normalizeSettings(data);
  } catch (error) {
    console.warn("Park settings unavailable:", error);
    return DEFAULT_PARK_SETTINGS;
  }
}
