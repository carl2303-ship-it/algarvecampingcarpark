import { createAdminClient } from "@/lib/supabase/admin";
import { createBalanceCheckoutSession } from "@/lib/stripe";
import { sendBalancePaymentRequest } from "@/lib/email";
import { resolveLocale } from "@/lib/email-i18n";
import { isReservationFullyPaid } from "@/lib/booking-deposit";
import { getParkSettings } from "@/lib/park-settings";
import { sendPreArrivalByReservationId } from "@/lib/pre-arrival";

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

type BalanceCandidate = {
  id: string;
  guest_email: string | null;
  guest_name: string;
  pitch_code: string | null;
  check_in: string;
  check_out: string;
  locale: string | null;
  total_cents: number;
  paid_cents: number | null;
  balance_payment_email_sent_at: string | null;
  zone: { name: string } | { name: string }[] | null;
};

function zoneNameFrom(reservation: BalanceCandidate): string {
  const zoneRelation = reservation.zone;
  if (Array.isArray(zoneRelation)) return zoneRelation[0]?.name ?? "Reserva";
  return zoneRelation?.name ?? "Reserva";
}

/** Create Stripe balance link, email guest, mark as sent. */
export async function sendBalancePaymentForReservation(
  reservation: BalanceCandidate
): Promise<{ checkout_url: string; sent_to: string }> {
  if (!reservation.guest_email) {
    throw new Error("E-mail du client manquant.");
  }

  const paid = reservation.paid_cents ?? 0;
  const balanceCents = Math.max(0, reservation.total_cents - paid);
  if (balanceCents < 50) {
    throw new Error("Aucun solde à encaisser.");
  }
  if (isReservationFullyPaid(paid, reservation.total_cents)) {
    throw new Error("Réservation déjà soldée.");
  }

  const locale = resolveLocale(reservation.locale);
  const zoneName = zoneNameFrom(reservation);
  const session = await createBalanceCheckoutSession({
    reservationId: reservation.id,
    balanceCents,
    guestEmail: reservation.guest_email,
    guestName: reservation.guest_name,
    zoneName,
    pitchCode: reservation.pitch_code,
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    locale,
  });

  if (!session.url) {
    throw new Error("Impossible de créer le lien Stripe.");
  }

  const supabase = createAdminClient();
  await supabase.from("payments").insert({
    reservation_id: reservation.id,
    stripe_session_id: session.id,
    amount_cents: balanceCents,
    status: "pending",
    notes: "Solde 50% (lien 48h avant arrivée)",
  });

  await sendBalancePaymentRequest({
    guestEmail: reservation.guest_email,
    guestName: reservation.guest_name,
    zoneName,
    pitchCode: reservation.pitch_code,
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    balanceCents,
    totalCents: reservation.total_cents,
    paidCents: paid,
    checkoutUrl: session.url,
    reservationId: reservation.id,
    locale,
  });

  const { error } = await supabase
    .from("reservations")
    .update({ balance_payment_email_sent_at: new Date().toISOString() })
    .eq("id", reservation.id);

  if (error) {
    throw new Error(`E-mail envoyé mais marquage échoué: ${error.message}`);
  }

  return { checkout_url: session.url, sent_to: reservation.guest_email };
}

/**
 * Send balance payment links for stays arriving in ~48h (check-in = tomorrow or +2 days),
 * still partially paid, email not yet sent.
 */
export async function runBalancePaymentEmails() {
  const supabase = createAdminClient();
  const tomorrow = lisbonDateOffset(1);
  const inTwoDays = lisbonDateOffset(2);

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(
      "id, guest_email, guest_name, pitch_code, check_in, check_out, locale, total_cents, paid_cents, balance_payment_email_sent_at, zone:zones(name)"
    )
    .eq("status", "confirmed")
    .in("check_in", [tomorrow, inTwoDays])
    .is("balance_payment_email_sent_at", null);

  if (error) throw error;

  const sent: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (const reservation of reservations ?? []) {
    const paid = reservation.paid_cents ?? 0;
    if (!reservation.guest_email || isReservationFullyPaid(paid, reservation.total_cents)) {
      skipped.push(reservation.id);
      continue;
    }
    if (reservation.total_cents - paid < 50) {
      skipped.push(reservation.id);
      continue;
    }

    try {
      await sendBalancePaymentForReservation(reservation as BalanceCandidate);
      sent.push(reservation.id);
    } catch (err) {
      console.error("Balance payment email failed:", reservation.id, err);
      failed.push(reservation.id);
    }
  }

  return {
    tomorrow,
    in_two_days: inTwoDays,
    candidates: reservations?.length ?? 0,
    sent: sent.length,
    failed: failed.length,
    skipped: skipped.length,
    sent_ids: sent,
    failed_ids: failed,
    skipped_ids: skipped,
  };
}

/** After full payment, send pre-arrival if pitch is set and arrival is near. */
export async function maybeSendPreArrivalAfterFullPayment(reservationId: string) {
  const supabase = createAdminClient();
  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id, guest_email, guest_name, pitch_code, check_in, check_out, locale, total_cents, paid_cents, pre_arrival_email_sent_at, status, zone:zones(name)"
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) return;
  if (!["confirmed", "checked_in"].includes(reservation.status)) return;
  if (reservation.pre_arrival_email_sent_at) return;
  if (!reservation.pitch_code?.trim()) return;
  if (!isReservationFullyPaid(reservation.paid_cents ?? 0, reservation.total_cents)) return;

  const yesterday = lisbonDateOffset(-1);
  const today = lisbonDateOffset(0);
  const tomorrow = lisbonDateOffset(1);
  if (![yesterday, today, tomorrow].includes(reservation.check_in)) return;

  try {
    await getParkSettings();
    await sendPreArrivalByReservationId(reservationId);
  } catch (err) {
    console.error("Auto pre-arrival after balance payment failed:", reservationId, err);
  }
}
