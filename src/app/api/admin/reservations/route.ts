import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZoneRates } from "@/lib/availability";
import { calculateTotalPrice } from "@/lib/pricing";
import { ADMIN_PAYMENT_METHODS } from "@/lib/admin-payment-methods";
import {
  syncReservationPaymentState,
  normalizeVehiclePlate,
  upsertGuestForReservation,
} from "@/lib/admin-reservation-payments";
import { findActiveReservationByPlate } from "@/lib/vehicle-plate-lookup";
import { sendBookingConfirmation } from "@/lib/email";
import { getParkSettings } from "@/lib/park-settings";

export const dynamic = "force-dynamic";

const paymentMethodSchema = z.enum(
  ADMIN_PAYMENT_METHODS.map((method) => method.value) as [string, ...string[]]
);

const createSchema = z.object({
  zone_id: z.string().uuid(),
  pitch_code: z.string().min(1).max(10),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().min(1),
  guest_email: z.string().email(),
  guest_phone: z.string().min(1),
  guest_country: z.string().trim().min(1, "Pays requis").max(80),
  vehicle_plate: z.string().min(1, "Matricule requis"),
  num_guests: z.number().int().min(1).max(10).default(2),
  operational_notes: z.string().optional(),
  notes: z.string().optional(),
  total_cents: z.number().int().min(0),
  initial_payment_cents: z.number().int().min(0).default(0),
  initial_payment_method: paymentMethodSchema.nullable().optional(),
  confirm_without_payment: z.boolean().optional().default(false),
  motorhome_over_9m: z.boolean().optional().default(false),
  electricity_amperage: z.union([z.literal(6), z.literal(10)]).nullable().optional(),
  manual_supplement_ids: z.array(z.string().uuid()).optional().default([]),
});

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());
    const supabase = createAdminClient();

    if (body.initial_payment_cents > 0 && !body.initial_payment_method) {
      return NextResponse.json({ error: "Sélectionnez le mode de paiement." }, { status: 400 });
    }

    if (body.confirm_without_payment && body.initial_payment_cents > 0) {
      return NextResponse.json(
        { error: "Impossible d'enregistrer un paiement initial avec une réservation sans paiement." },
        { status: 400 }
      );
    }

    if (body.initial_payment_cents > body.total_cents) {
      return NextResponse.json(
        { error: "Le paiement initial ne peut pas dépasser le total." },
        { status: 400 }
      );
    }

    const plate = normalizeVehiclePlate(body.vehicle_plate);

    const activeForPlate = await findActiveReservationByPlate(supabase, plate);
    if (activeForPlate) {
      const pitch = activeForPlate.pitch_code ? ` · ${activeForPlate.pitch_code}` : "";
      return NextResponse.json(
        {
          error: `Cette immatriculation a déjà une réservation active (${activeForPlate.check_in} → ${activeForPlate.check_out}${pitch}).`,
          active_reservation: activeForPlate,
        },
        { status: 409 }
      );
    }

    const status =
      body.confirm_without_payment || body.initial_payment_cents > 0
        ? "confirmed"
        : "pending_payment";

    const { data: reservation, error } = await supabase
      .from("reservations")
      .insert({
        zone_id: body.zone_id,
        pitch_code: body.pitch_code.toUpperCase(),
        check_in: body.check_in,
        check_out: body.check_out,
        status,
        guest_name: body.guest_name,
        guest_email: body.guest_email,
        guest_phone: body.guest_phone,
        vehicle_plate: plate,
        num_guests: body.num_guests,
        notes: body.notes || null,
        operational_notes: body.operational_notes || null,
        total_cents: body.total_cents,
        paid_cents: 0,
        partial_payment_cents: 0,
        partial_payment_method: null,
        payment_method: body.confirm_without_payment
          ? null
          : (body.initial_payment_method ?? null),
        payment_status: "pending",
        electricity: body.electricity_amperage != null,
        electricity_amperage: body.electricity_amperage ?? null,
        motorhome_over_9m: body.motorhome_over_9m ?? false,
        manual_supplement_ids: body.manual_supplement_ids ?? [],
        created_by_admin: true,
        expires_at: null,
      })
      .select("id, total_cents, status")
      .single();

    if (error || !reservation) {
      console.error("Admin reservation create error:", error);
      return NextResponse.json({ error: error?.message ?? "Erreur" }, { status: 500 });
    }

    if (!body.confirm_without_payment && body.initial_payment_cents > 0) {
      await supabase.from("payments").insert({
        reservation_id: reservation.id,
        amount_cents: body.initial_payment_cents,
        currency: "eur",
        status: "succeeded",
        payment_method: body.initial_payment_method,
        notes: "Paiement initial (admin)",
      });
    }

    const totals = await syncReservationPaymentState(supabase, reservation.id);

    const guestId = await upsertGuestForReservation(supabase, {
      name: body.guest_name,
      email: body.guest_email,
      phone: body.guest_phone,
      vehicle_plate: plate,
      country: body.guest_country,
    });

    if (guestId) {
      await supabase.from("reservations").update({ guest_id: guestId }).eq("id", reservation.id);
    }

    const { data: updated } = await supabase
      .from("reservations")
      .select("status, total_cents")
      .eq("id", reservation.id)
      .single();

    const finalStatus = updated?.status ?? reservation.status;
    let confirmationEmailError: string | null = null;

    if (finalStatus === "confirmed" && body.guest_email) {
      try {
        const parkSettings = await getParkSettings();
        const { data: zoneRow } = await supabase
          .from("zones")
          .select("name")
          .eq("id", body.zone_id)
          .maybeSingle();
        await sendBookingConfirmation({
          guestEmail: body.guest_email,
          guestName: body.guest_name,
          zoneName: zoneRow?.name ?? "Reserva",
          pitchCode: body.pitch_code.toUpperCase(),
          checkIn: body.check_in,
          checkOut: body.check_out,
          checkInTime: parkSettings.check_in_time,
          checkOutTime: parkSettings.check_out_time,
          totalCents: updated?.total_cents ?? reservation.total_cents,
          paidCents: totals.paid_cents,
          balanceCents: Math.max(
            0,
            (updated?.total_cents ?? reservation.total_cents) - totals.paid_cents
          ),
          reservationId: reservation.id,
          locale: "fr",
        });
      } catch (emailError) {
        confirmationEmailError =
          emailError instanceof Error ? emailError.message : "E-mail de confirmation non envoyé";
        console.error("Admin create: confirmation email failed:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      reservation_id: reservation.id,
      total_cents: updated?.total_cents ?? reservation.total_cents,
      paid_cents: totals.paid_cents,
      balance_cents: Math.max(0, (updated?.total_cents ?? reservation.total_cents) - totals.paid_cents),
      status: finalStatus,
      confirmation_email_error: confirmationEmailError,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar reserva";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
