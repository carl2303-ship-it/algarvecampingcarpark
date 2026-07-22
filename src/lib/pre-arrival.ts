import { createAdminClient } from "@/lib/supabase/admin";
import { sendPreArrivalAccess } from "@/lib/email";
import { getParkSettings } from "@/lib/park-settings";

function lisbonDateOffset(daysFromToday: number): string {
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
  const target = new Date(Date.UTC(year, month - 1, day + daysFromToday));
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type PreArrivalReservation = {
  id: string;
  guest_email: string | null;
  guest_name: string;
  pitch_code: string | null;
  check_in: string;
  check_out: string;
  locale: string | null;
  zone: { name: string } | { name: string }[] | null;
};

function zoneNameFrom(reservation: PreArrivalReservation): string {
  const zoneRelation = reservation.zone;
  if (Array.isArray(zoneRelation)) return zoneRelation[0]?.name ?? "Reserva";
  return zoneRelation?.name ?? "Reserva";
}

/** Send pitch + barrier code email and mark as sent. Requires pitch_code. */
export async function sendPreArrivalForReservation(
  reservation: PreArrivalReservation,
  options?: { force?: boolean }
): Promise<void> {
  if (!reservation.guest_email) {
    throw new Error("E-mail du client manquant.");
  }
  if (!reservation.pitch_code?.trim()) {
    throw new Error(
      "Attribuez d'abord un emplacement — l'e-mail pré-arrivée inclut le lieu et le code barrière."
    );
  }

  const parkSettings = await getParkSettings();
  if (!parkSettings.gate_access_code?.trim()) {
    throw new Error(
      "Code barrière manquant. Configurez-le dans Paramètres → Code d'accès barrière."
    );
  }

  await sendPreArrivalAccess({
    guestEmail: reservation.guest_email,
    guestName: reservation.guest_name,
    zoneName: zoneNameFrom(reservation),
    pitchCode: reservation.pitch_code,
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    checkInTime: parkSettings.check_in_time,
    checkOutTime: parkSettings.check_out_time,
    gateAccessCode: parkSettings.gate_access_code,
    reservationId: reservation.id,
    locale: reservation.locale,
  });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reservations")
    .update({ pre_arrival_email_sent_at: new Date().toISOString() })
    .eq("id", reservation.id);

  if (error) {
    throw new Error(`E-mail envoyé mais marquage échoué: ${error.message}`);
  }

  void options;
}

export async function sendPreArrivalByReservationId(
  reservationId: string,
  options?: { force?: boolean }
): Promise<{ sent_to: string }> {
  const supabase = createAdminClient();
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select(
      "id, guest_email, guest_name, pitch_code, check_in, check_out, locale, pre_arrival_email_sent_at, status, zone:zones(name)"
    )
    .eq("id", reservationId)
    .single();

  if (error || !reservation) {
    throw new Error("Réservation introuvable");
  }

  if (!["confirmed", "checked_in"].includes(reservation.status)) {
    throw new Error("La réservation doit être confirmée.");
  }

  if (reservation.pre_arrival_email_sent_at && !options?.force) {
    throw new Error("L'e-mail pré-arrivée a déjà été envoyé pour cette réservation.");
  }

  await sendPreArrivalForReservation(reservation as PreArrivalReservation, options);
  return { sent_to: reservation.guest_email! };
}

export async function runPreArrivalEmails() {
  const supabase = createAdminClient();
  const yesterday = lisbonDateOffset(-1);
  const today = lisbonDateOffset(0);
  const tomorrow = lisbonDateOffset(1);

  // Yesterday = late catch-up; today/tomorrow = standard window.
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, guest_email, guest_name, pitch_code, check_in, check_out, locale, zone:zones(name)")
    .eq("status", "confirmed")
    .in("check_in", [yesterday, today, tomorrow])
    .is("pre_arrival_email_sent_at", null)
    .not("pitch_code", "is", null);

  if (error) throw error;

  const sent: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (const reservation of reservations ?? []) {
    if (!reservation.guest_email || !reservation.pitch_code) {
      skipped.push(reservation.id);
      continue;
    }

    try {
      await sendPreArrivalForReservation(reservation as PreArrivalReservation);
      sent.push(reservation.id);
    } catch (err) {
      console.error("Pre-arrival email failed:", reservation.id, err);
      failed.push(reservation.id);
    }
  }

  return {
    yesterday,
    today,
    tomorrow,
    check_in_dates: [yesterday, today, tomorrow],
    candidates: reservations?.length ?? 0,
    sent: sent.length,
    failed: failed.length,
    skipped: skipped.length,
    sent_ids: sent,
    failed_ids: failed,
    skipped_ids: skipped,
  };
}
