import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZoneRates } from "@/lib/availability";
import { calculateTotalPrice } from "@/lib/pricing";
import { ADMIN_PAYMENT_METHODS } from "@/lib/admin-payment-methods";
import { releaseReservationPitch } from "@/lib/reservation-checkout";

export const dynamic = "force-dynamic";

const paymentMethodSchema = z.enum(
  ADMIN_PAYMENT_METHODS.map((method) => method.value) as [string, ...string[]]
);

const updateSchema = z.object({
  zone_id: z.string().uuid(),
  pitch_code: z.string().min(1).max(10),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().min(1),
  guest_email: z.string().email(),
  guest_phone: z.string().min(1),
  vehicle_plate: z.string().optional(),
  num_guests: z.number().int().min(1).max(10).default(2),
  operational_notes: z.string().optional(),
  notes: z.string().optional(),
  total_cents: z.number().int().min(0).optional(),
  is_fully_paid: z.boolean().default(false),
  payment_method: paymentMethodSchema.nullable().optional(),
  partial_payment_cents: z.number().int().min(0).default(0),
  partial_payment_method: paymentMethodSchema.nullable().optional(),
});

function resolvePaymentStatus(
  paidCents: number,
  totalCents: number,
  paymentMethod: string | null,
  stripePaymentIntentId: string | null
) {
  if (paidCents >= totalCents && totalCents > 0) {
    if (paymentMethod === "stripe" || stripePaymentIntentId) return "paid_stripe";
    return "paid_manual";
  }
  if (paidCents > 0) return "partial";
  return "pending";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = updateSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    if (["cancelled", "expired"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Cette réservation ne peut pas être modifiée" },
        { status: 400 }
      );
    }

    if (body.check_out <= body.check_in) {
      return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }

    const rates = await getZoneRates(body.zone_id);
    const pricing = calculateTotalPrice(
      rates,
      body.check_in,
      body.check_out,
      body.num_guests
    );

    const total_cents = body.total_cents ?? pricing.totalCents;
    const paid_cents = body.is_fully_paid
      ? total_cents
      : Math.min(body.partial_payment_cents, total_cents);
    const balance_cents = total_cents - paid_cents;

    const payment_method = body.is_fully_paid
      ? body.payment_method ?? null
      : paid_cents > 0
        ? body.partial_payment_method ?? body.payment_method ?? null
        : body.payment_method ?? null;

    const pitch_code = body.pitch_code.toUpperCase();
    const oldPitchCode = existing.pitch_code as string | null;
    const pitchChanged = oldPitchCode !== pitch_code;

    let status = existing.status as string;
    if (status === "pending_payment" && paid_cents > 0) {
      status = "confirmed";
    }

    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        zone_id: body.zone_id,
        pitch_code,
        check_in: body.check_in,
        check_out: body.check_out,
        status,
        guest_name: body.guest_name,
        guest_email: body.guest_email,
        guest_phone: body.guest_phone,
        vehicle_plate: body.vehicle_plate || null,
        num_guests: body.num_guests,
        notes: body.notes || null,
        operational_notes: body.operational_notes || null,
        total_cents,
        paid_cents,
        partial_payment_cents: body.is_fully_paid ? 0 : paid_cents,
        partial_payment_method: body.is_fully_paid ? null : body.partial_payment_method ?? null,
        payment_method,
        payment_status: resolvePaymentStatus(
          paid_cents,
          total_cents,
          payment_method,
          existing.stripe_payment_intent_id
        ),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Admin reservation update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (existing.status === "checked_in" && pitchChanged) {
      if (oldPitchCode) {
        await supabase
          .from("pitch_map_spots")
          .update({ status: "available" })
          .eq("code", oldPitchCode);
      }
      await supabase
        .from("pitch_map_spots")
        .update({ status: "occupied" })
        .eq("code", pitch_code);
    }

    if (existing.status === "checked_out" && pitchChanged) {
      await releaseReservationPitch({
        pitch_id: existing.pitch_id,
        pitch_code: oldPitchCode,
      });
    }

    const { data: existingGuest } = await supabase
      .from("guests")
      .select("id")
      .ilike("email", body.guest_email)
      .maybeSingle();

    let guestId = existingGuest?.id;
    if (!guestId) {
      const { data: newGuest } = await supabase
        .from("guests")
        .insert({
          name: body.guest_name,
          email: body.guest_email,
          phone: body.guest_phone,
          vehicle_plate: body.vehicle_plate || null,
        })
        .select("id")
        .single();
      guestId = newGuest?.id;
    } else {
      await supabase
        .from("guests")
        .update({
          name: body.guest_name,
          phone: body.guest_phone,
          vehicle_plate: body.vehicle_plate || null,
        })
        .eq("id", guestId);
    }

    if (guestId) {
      await supabase.from("reservations").update({ guest_id: guestId }).eq("id", id);
    }

    return NextResponse.json({
      success: true,
      reservation_id: id,
      total_cents,
      paid_cents,
      balance_cents,
      status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
