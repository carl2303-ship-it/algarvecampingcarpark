import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import { DEFAULT_PARK_SETTINGS, type ParkSettings } from "@/lib/constants";

export type { ParkSettings };

const PARK_SETTINGS_COLUMNS =
  "reception_open, reception_close, check_in_time, check_out_time, gate_access_code, online_booking_enabled, online_booking_starts_at, online_booking_ends_at";

function normalizeSettings(row: Partial<ParkSettings> | null): ParkSettings {
  return {
    reception_open: row?.reception_open ?? DEFAULT_PARK_SETTINGS.reception_open,
    reception_close: row?.reception_close ?? DEFAULT_PARK_SETTINGS.reception_close,
    check_in_time: row?.check_in_time ?? DEFAULT_PARK_SETTINGS.check_in_time,
    check_out_time: row?.check_out_time ?? DEFAULT_PARK_SETTINGS.check_out_time,
    gate_access_code: row?.gate_access_code?.trim() || null,
    online_booking_enabled:
      row?.online_booking_enabled ?? DEFAULT_PARK_SETTINGS.online_booking_enabled,
    online_booking_starts_at: row?.online_booking_starts_at ?? null,
    online_booking_ends_at: row?.online_booking_ends_at ?? null,
  };
}

export function isOnlineBookingOpen(
  settings: ParkSettings,
  now: Date = new Date()
): boolean {
  if (!settings.online_booking_enabled) return false;

  const ts = now.getTime();
  if (settings.online_booking_starts_at) {
    const start = new Date(settings.online_booking_starts_at).getTime();
    if (!Number.isNaN(start) && ts < start) return false;
  }
  if (settings.online_booking_ends_at) {
    const end = new Date(settings.online_booking_ends_at).getTime();
    if (!Number.isNaN(end) && ts > end) return false;
  }
  return true;
}

export async function getParkSettings(): Promise<ParkSettings> {
  if (!getPublicSupabaseConfig()) {
    return DEFAULT_PARK_SETTINGS;
  }

  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("park_settings")
      .select(PARK_SETTINGS_COLUMNS)
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

export async function isOnlineBookingCurrentlyOpen(): Promise<boolean> {
  const settings = await getParkSettings();
  return isOnlineBookingOpen(settings);
}
