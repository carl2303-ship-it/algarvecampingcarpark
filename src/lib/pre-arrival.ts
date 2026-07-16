import { createAdminClient } from "@/lib/supabase/admin";
import { sendPreArrivalAccess } from "@/lib/email";
import { getParkSettings } from "@/lib/park-settings";

function tomorrowInLisbon(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayParts = formatter.formatToParts(new Date());
  const year = Number(todayParts.find((p) => p.type === "year")?.value);
  const month = Number(todayParts.find((p) => p.type === "month")?.value);
  const day = Number(todayParts.find((p) => p.type === "day")?.value);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  const y = tomorrow.getUTCFullYear();
  const m = String(tomorrow.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function runPreArrivalEmails() {
  const supabase = createAdminClient();
  const parkSettings = await getParkSettings();
  const checkInDate = tomorrowInLisbon();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, guest_email, guest_name, pitch_code, check_in, check_out, locale, zone:zones(name)")
    .eq("status", "confirmed")
    .eq("check_in", checkInDate)
    .is("pre_arrival_email_sent_at", null);

  if (error) throw error;

  const sent: string[] = [];
  const failed: string[] = [];

  for (const reservation of reservations ?? []) {
    if (!reservation.guest_email) {
      failed.push(reservation.id);
      continue;
    }

    try {
      const zoneRelation = reservation.zone as
        | { name: string }
        | { name: string }[]
        | null;
      const zoneName = Array.isArray(zoneRelation)
        ? zoneRelation[0]?.name ?? "Reserva"
        : zoneRelation?.name ?? "Reserva";

      await sendPreArrivalAccess({
        guestEmail: reservation.guest_email,
        guestName: reservation.guest_name,
        zoneName,
        pitchCode: reservation.pitch_code,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        checkInTime: parkSettings.check_in_time,
        checkOutTime: parkSettings.check_out_time,
        gateAccessCode: parkSettings.gate_access_code,
        reservationId: reservation.id,
        locale: reservation.locale,
      });

      await supabase
        .from("reservations")
        .update({ pre_arrival_email_sent_at: new Date().toISOString() })
        .eq("id", reservation.id);

      sent.push(reservation.id);
    } catch (err) {
      console.error("Pre-arrival email failed:", reservation.id, err);
      failed.push(reservation.id);
    }
  }

  return {
    check_in: checkInDate,
    candidates: reservations?.length ?? 0,
    sent: sent.length,
    failed: failed.length,
    sent_ids: sent,
    failed_ids: failed,
  };
}
