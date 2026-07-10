import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_PAYMENT_METHODS } from "@/lib/admin-payment-methods";

export type ClientPaymentHistoryRow = {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  reservation_id: string;
  check_in: string;
  check_out: string;
  pitch_code: string | null;
};

export function normalizeVehiclePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, "");
}

export function resolveReservationPaymentStatus(
  paidCents: number,
  totalCents: number,
  stripePaymentIntentId: string | null
): string {
  if (paidCents >= totalCents && totalCents > 0) {
    if (stripePaymentIntentId) return "paid_stripe";
    return "paid_manual";
  }
  if (paidCents > 0) return "partial";
  return "pending";
}

export async function sumSucceededPayments(
  supabase: SupabaseClient,
  reservationId: string
): Promise<number> {
  const { data } = await supabase
    .from("payments")
    .select("amount_cents")
    .eq("reservation_id", reservationId)
    .eq("status", "succeeded");

  return (data ?? []).reduce((sum, payment) => sum + payment.amount_cents, 0);
}

export async function syncReservationPaymentState(
  supabase: SupabaseClient,
  reservationId: string
): Promise<{ paid_cents: number; payment_status: string }> {
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("total_cents, status, stripe_payment_intent_id")
    .eq("id", reservationId)
    .single();

  if (error || !reservation) {
    throw new Error(error?.message ?? "Réservation introuvable");
  }

  const paid_cents = await sumSucceededPayments(supabase, reservationId);
  const payment_status = resolveReservationPaymentStatus(
    paid_cents,
    reservation.total_cents,
    reservation.stripe_payment_intent_id
  );

  const updates: Record<string, unknown> = {
    paid_cents,
    payment_status,
    partial_payment_cents: 0,
    partial_payment_method: null,
  };

  if (reservation.status === "pending_payment" && paid_cents > 0) {
    updates.status = "confirmed";
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", reservationId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { paid_cents, payment_status };
}

export async function getClientPaymentHistory(
  supabase: SupabaseClient,
  vehiclePlate: string
): Promise<ClientPaymentHistoryRow[]> {
  const plate = normalizeVehiclePlate(vehiclePlate);
  if (!plate) return [];

  const { data: reservations, error: reservationsError } = await supabase
    .from("reservations")
    .select("id, check_in, check_out, pitch_code, vehicle_plate")
    .not("vehicle_plate", "is", null);

  if (reservationsError) {
    throw new Error(reservationsError.message);
  }

  const reservationById = new Map(
    (reservations ?? [])
      .filter(
        (reservation) => normalizeVehiclePlate(reservation.vehicle_plate ?? "") === plate
      )
      .map((reservation) => [reservation.id, reservation])
  );

  if (reservationById.size === 0) {
    return [];
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("id, amount_cents, payment_method, notes, created_at, reservation_id")
    .in("reservation_id", [...reservationById.keys()])
    .eq("status", "succeeded")
    .order("created_at", { ascending: true });

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  return (payments ?? []).flatMap((payment) => {
    const reservation = reservationById.get(payment.reservation_id);
    if (!reservation) return [];

    return [
      {
        id: payment.id,
        amount_cents: payment.amount_cents,
        payment_method: payment.payment_method,
        notes: payment.notes,
        created_at: payment.created_at,
        reservation_id: payment.reservation_id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        pitch_code: reservation.pitch_code,
      },
    ];
  });
}

export async function upsertGuestForReservation(
  supabase: SupabaseClient,
  input: {
    name: string;
    email: string;
    phone: string;
    vehicle_plate?: string | null;
    country?: string | null;
  }
): Promise<string | null> {
  const plate = normalizeVehiclePlate(input.vehicle_plate ?? "");
  if (!plate) return null;

  const { data: existingGuest } = await supabase
    .from("guests")
    .select("id")
    .eq("vehicle_plate", plate)
    .maybeSingle();

  const guestPayload = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    vehicle_plate: plate,
    country: input.country?.trim() || null,
  };

  if (!existingGuest?.id) {
    const { data: newGuest } = await supabase
      .from("guests")
      .insert(guestPayload)
      .select("id")
      .single();
    return newGuest?.id ?? null;
  }

  await supabase.from("guests").update(guestPayload).eq("id", existingGuest.id);
  return existingGuest.id;
}

export function isAdminPaymentMethod(
  value: string
): value is (typeof ADMIN_PAYMENT_METHODS)[number]["value"] {
  return ADMIN_PAYMENT_METHODS.some((method) => method.value === value);
}
