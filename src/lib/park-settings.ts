import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import { DEFAULT_PARK_SETTINGS, type ParkSettings } from "@/lib/constants";

export type { ParkSettings };

const PARK_SETTINGS_COLUMNS =
  "reception_open, reception_close, check_in_time, check_out_time, gate_access_code, online_booking_enabled, online_booking_starts_at, online_booking_ends_at, extra_guest_cents_per_night, long_motorhome_cents_per_night, electricity_10a_surcharge_cents_per_night";

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
    extra_guest_cents_per_night:
      row?.extra_guest_cents_per_night ??
      DEFAULT_PARK_SETTINGS.extra_guest_cents_per_night,
    long_motorhome_cents_per_night:
      row?.long_motorhome_cents_per_night ??
      DEFAULT_PARK_SETTINGS.long_motorhome_cents_per_night,
    electricity_10a_surcharge_cents_per_night:
      row?.electricity_10a_surcharge_cents_per_night ??
      DEFAULT_PARK_SETTINGS.electricity_10a_surcharge_cents_per_night,
  };
}

/** Calendar day (yyyy-MM-dd) in Europe/Lisbon for an ISO timestamp. */
export function lisbonDateFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function monthDay(ymd: string): string {
  return ymd.slice(5, 10);
}

export function addCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export type OnlineBookableSeason = {
  /** First bookable night / check-in, as MM-DD (repeats every year) */
  fromMd: string | null;
  /** Last bookable night, as MM-DD (repeats every year). Check-out may be the next day. */
  untilMd: string | null;
};

/**
 * Annual season from admin dates (year is ignored — 01/04→19/09 every year).
 * `until` = last night; departure the following morning is allowed.
 */
export function getOnlineBookableSeason(settings: ParkSettings): OnlineBookableSeason {
  const from = lisbonDateFromIso(settings.online_booking_starts_at);
  const until = lisbonDateFromIso(settings.online_booking_ends_at);
  return {
    fromMd: from ? monthDay(from) : null,
    untilMd: until ? monthDay(until) : null,
  };
}

/** @deprecated Use getOnlineBookableSeason — kept for display helpers */
export function getOnlineBookableDateRange(settings: ParkSettings): {
  from: string | null;
  until: string | null;
} {
  const season = getOnlineBookableSeason(settings);
  return { from: season.fromMd, until: season.untilMd };
}

function isNightInSeason(ymd: string, season: OnlineBookableSeason): boolean {
  const md = monthDay(ymd);
  if (season.fromMd && md < season.fromMd) return false;
  if (season.untilMd && md > season.untilMd) return false;
  return true;
}

/** Check-in day selectable on the public calendar. */
export function isOnlineBookableCheckInDay(
  settings: ParkSettings,
  ymd: string
): boolean {
  const season = getOnlineBookableSeason(settings);
  if (!season.fromMd && !season.untilMd) return true;
  return isNightInSeason(ymd, season);
}

/**
 * Check-out day selectable: previous calendar day must be a bookable night
 * (so last night 19/09 → check-out 20/09 is allowed).
 */
export function isOnlineBookableCheckOutDay(
  settings: ParkSettings,
  ymd: string
): boolean {
  const season = getOnlineBookableSeason(settings);
  if (!season.fromMd && !season.untilMd) return true;
  const lastNight = addCalendarDays(ymd, -1);
  return isNightInSeason(lastNight, season);
}

/**
 * Every night of the stay (check_in .. check_out exclusive) must fall in the annual season.
 */
export function isStayWithinOnlineBookableWindow(
  settings: ParkSettings,
  checkIn: string,
  checkOut: string
): boolean {
  const season = getOnlineBookableSeason(settings);
  if (!season.fromMd && !season.untilMd) return true;
  if (checkOut <= checkIn) return false;

  let night = checkIn;
  while (night < checkOut) {
    if (!isNightInSeason(night, season)) return false;
    night = addCalendarDays(night, 1);
  }
  return true;
}

export function formatSeasonDayPt(md: string | null): string {
  if (!md || !/^\d{2}-\d{2}$/.test(md)) return "…";
  const [mm, dd] = md.split("-");
  return `${dd}/${mm}`;
}

export function isOnlineBookingOpen(settings: ParkSettings): boolean {
  // Period starts/ends only block stay dates on the calendar — they do not close the portal.
  return settings.online_booking_enabled;
}

function currentTimeInLisbon(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function isWithinReceptionHours(
  settings: ParkSettings,
  now: Date = new Date()
): boolean {
  const current = currentTimeInLisbon(now);
  const { reception_open: open, reception_close: close } = settings;

  if (open <= close) {
    return current >= open && current < close;
  }

  // Overnight window (e.g. 22:00 – 06:00)
  return current >= open || current < close;
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
