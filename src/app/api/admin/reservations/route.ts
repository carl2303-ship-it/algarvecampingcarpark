import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZoneRates } from "@/lib/availability";
import { calculateTotalPrice } from "@/lib/pricing";
import { ADMIN_PAYMENT_METHODS } from "@/lib/admin-payment-methods";

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

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());
    const supabase = createAdminClient();

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

    const status =
      paid_cents >= total_cents ? "confirmed" : paid_cents > 0 ? "confirmed" : "pending_payment";

    const payment_method = body.is_fully_paid
      ? body.payment_method ?? null
      : paid_cents > 0
        ? body.partial_payment_method ?? body.payment_method ?? null
        : body.payment_method ?? null;

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
        vehicle_plate: body.vehicle_plate || null,
        num_guests: body.num_guests,
        notes: body.notes || null,
        operational_notes: body.operational_notes || null,
        total_cents,
        paid_cents,
        partial_payment_cents: body.is_fully_paid ? 0 : paid_cents,
        partial_payment_method: body.is_fully_paid ? null : body.partial_payment_method ?? null,
        payment_method,
        payment_status:
          paid_cents >= total_cents
            ? payment_method === "stripe"
              ? "paid_stripe"
              : "paid_manual"
            : paid_cents > 0
              ? "partial"
              : "pending",
        electricity: true,
        created_by_admin: true,
        expires_at: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Admin reservation create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (paid_cents > 0) {
      await supabase.from("payments").insert({
        reservation_id: reservation.id,
        amount_cents: paid_cents,
        currency: "eur",
        status: "succeeded",
        payment_method: payment_method,
        notes: body.is_fully_paid ? "Pagamento integral (admin)" : "Pagamento parcial (admin)",
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
      await supabase.from("reservations").update({ guest_id: guestId }).eq("id", reservation.id);
    }

    return NextResponse.json({
      success: true,
      reservation_id: reservation.id,
      total_cents,
      paid_cents,
      balance_cents,
      status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar reserva";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
