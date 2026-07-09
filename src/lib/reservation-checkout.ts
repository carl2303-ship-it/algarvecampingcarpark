import { createAdminClient } from "@/lib/supabase/admin";
import { getParkSettings } from "@/lib/park-settings";

export type AutoCheckoutResult = {
  processed: number;
  released_pitches: string[];
  reservation_ids: string[];
};

function getLisbonNow() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return { date, time };
}

function isPastCheckoutTime(time: string, checkOutTime: string) {
  const [hour, minute] = checkOutTime.split(":").map(Number);
  const [currentHour, currentMinute] = time.split(":").map(Number);
  if (currentHour > hour) return true;
  if (currentHour === hour && currentMinute >= minute) return true;
  return false;
}

export async function releaseReservationPitch(reservation: {
  pitch_id: string | null;
  pitch_code: string | null;
}) {
  const supabase = createAdminClient();

  if (reservation.pitch_id) {
    await supabase.from("pitches").update({ status: "available" }).eq("id", reservation.pitch_id);
  }

  if (reservation.pitch_code) {
    await supabase
      .from("pitch_map_spots")
      .update({ status: "available" })
      .eq("code", reservation.pitch_code);
  }
}

export async function runAutoCheckout(force = false): Promise<AutoCheckoutResult> {
  const supabase = createAdminClient();
  const settings = await getParkSettings();
  const { date: today, time } = getLisbonNow();

  if (!force && !isPastCheckoutTime(time, settings.check_out_time)) {
    return { processed: 0, released_pitches: [], reservation_ids: [] };
  }

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, pitch_id, pitch_code, check_out, status")
    .in("status", ["checked_in", "confirmed"])
    .lte("check_out", today);

  if (error) throw error;

  const due = (reservations ?? []).filter((reservation) => {
    if (reservation.check_out < today) return true;
    return reservation.check_out === today && (force || isPastCheckoutTime(time, settings.check_out_time));
  });

  const released_pitches: string[] = [];
  const reservation_ids: string[] = [];

  for (const reservation of due) {
    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "checked_out",
        checked_out_at: new Date().toISOString(),
      })
      .eq("id", reservation.id)
      .in("status", ["checked_in", "confirmed"]);

    if (updateError) {
      console.error("Auto checkout failed for", reservation.id, updateError);
      continue;
    }

    await releaseReservationPitch(reservation);
    reservation_ids.push(reservation.id);
    if (reservation.pitch_code) released_pitches.push(reservation.pitch_code);
  }

  return {
    processed: reservation_ids.length,
    released_pitches,
    reservation_ids,
  };
}
