import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { quoteEarlyArrival } from "@/lib/stay-extension";

export const dynamic = "force-dynamic";

const earlyArrivalSchema = z.object({
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = earlyArrivalSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    const quote = await quoteEarlyArrival({
      reservation: {
        id: reservation.id,
        status: reservation.status,
        zone_id: reservation.zone_id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        total_cents: reservation.total_cents,
        num_guests: reservation.num_guests,
        pitch_code: reservation.pitch_code,
        electricity_amperage: reservation.electricity_amperage,
        motorhome_over_9m: reservation.motorhome_over_9m,
        manual_supplement_ids: reservation.manual_supplement_ids,
      },
      newCheckIn: body.check_in,
    });

    if (!quote.available) {
      const status = quote.conflict ? 409 : 400;
      return NextResponse.json(
        {
          error: quote.error ?? "Impossible de modifier la date d'arrivée",
          conflict: quote.conflict,
        },
        { status }
      );
    }

    const paidCents = reservation.paid_cents ?? 0;
    const paymentStatus =
      quote.newTotalCents <= 0
        ? reservation.payment_status
        : paidCents >= quote.newTotalCents
          ? reservation.payment_status
          : paidCents > 0
            ? "partial"
            : "pending";

    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        check_in: quote.newCheckIn,
        total_cents: quote.newTotalCents,
        payment_status: paymentStatus,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Ledger note only — does not count as paid (status != succeeded).
    // Keeps a frozen period line for the extra nights without rewriting past payments.
    if (quote.extraCents > 0 || quote.nightsAdded > 0) {
      await supabase.from("payments").insert({
        reservation_id: id,
        amount_cents: quote.extraCents,
        currency: "eur",
        status: "adjustment",
        payment_method: null,
        notes: `Arrivée anticipée : ${quote.newCheckIn} → ${quote.oldCheckIn} (+${quote.nightsAdded} nuit(s), solde à régler)`,
        period_check_in: quote.newCheckIn,
        period_check_out: quote.oldCheckIn,
      });
    }

    return NextResponse.json({
      success: true,
      check_in: quote.newCheckIn,
      check_out: quote.checkOut,
      total_cents: quote.newTotalCents,
      extra_cents: quote.extraCents,
      nights_added: quote.nightsAdded,
      paid_cents: paidCents,
      balance_cents: Math.max(0, quote.newTotalCents - paidCents),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Erreur lors du changement d'arrivée";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
