import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_PAYMENT_METHODS } from "@/lib/admin-payment-methods";
import { syncReservationPaymentState } from "@/lib/admin-reservation-payments";

export const dynamic = "force-dynamic";

const paymentMethodSchema = z.enum(
  ADMIN_PAYMENT_METHODS.map((method) => method.value) as [string, ...string[]]
);

const addPaymentSchema = z.object({
  amount_cents: z.number().int().positive(),
  payment_method: paymentMethodSchema,
  notes: z.string().max(500).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount_cents, currency, status, payment_method, notes, created_at")
    .eq("reservation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = addPaymentSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("id, total_cents, paid_cents, status")
      .eq("id", id)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    if (["cancelled", "expired", "checked_out"].includes(reservation.status)) {
      return NextResponse.json(
        { error: "Impossible d'ajouter un paiement à cette réservation" },
        { status: 400 }
      );
    }

    const remaining = reservation.total_cents - (reservation.paid_cents ?? 0);
    if (body.amount_cents > remaining) {
      return NextResponse.json(
        {
          error: `Le montant dépasse le solde restant (${(remaining / 100).toFixed(2)} €).`,
        },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("payments").insert({
      reservation_id: id,
      amount_cents: body.amount_cents,
      currency: "eur",
      status: "succeeded",
      payment_method: body.payment_method,
      notes: body.notes?.trim() || null,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const totals = await syncReservationPaymentState(supabase, id);

    return NextResponse.json({
      success: true,
      paid_cents: totals.paid_cents,
      payment_status: totals.payment_status,
      balance_cents: Math.max(0, reservation.total_cents - totals.paid_cents),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erreur lors de l'enregistrement du paiement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
