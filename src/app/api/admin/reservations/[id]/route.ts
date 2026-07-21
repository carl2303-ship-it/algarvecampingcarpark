import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseReservationPitch } from "@/lib/reservation-checkout";
import {
  syncReservationPaymentState,
  normalizeVehiclePlate,
  upsertGuestForReservation,
} from "@/lib/admin-reservation-payments";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  zone_id: z.string().uuid(),
  pitch_code: z.string().min(1).max(10),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().min(1),
  guest_email: z.string().email(),
  guest_phone: z.string().min(1),
  guest_country: z.string().max(80).optional(),
  vehicle_plate: z.string().min(1, "Matricule requis"),
  num_guests: z.number().int().min(1).max(10).default(2),
  operational_notes: z.string().optional(),
  notes: z.string().optional(),
  total_cents: z.number().int().min(0),
  motorhome_over_9m: z.boolean().optional().default(false),
  electricity_amperage: z.union([z.literal(6), z.literal(10)]).nullable().optional(),
  manual_supplement_ids: z.array(z.string().uuid()).optional().default([]),
});

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

    const pitch_code = body.pitch_code.toUpperCase();

    if (
      ["confirmed", "checked_in", "pending_payment"].includes(existing.status) &&
      pitch_code
    ) {
      const { findPitchOverlapConflict } = await import("@/lib/availability");
      const conflict = await findPitchOverlapConflict({
        pitchCode: pitch_code,
        checkIn: body.check_in,
        checkOut: body.check_out,
        excludeReservationId: id,
      });

      if (conflict) {
        return NextResponse.json(
          {
            error: `L'emplacement ${pitch_code} est déjà réservé (${conflict.guest_name}, ${conflict.check_in} → ${conflict.check_out}). Réattribuez d'abord cette réservation.`,
            conflict,
          },
          { status: 409 }
        );
      }
    }

    const plate = normalizeVehiclePlate(body.vehicle_plate);
    const oldPitchCode = existing.pitch_code as string | null;
    const pitchChanged = oldPitchCode !== pitch_code;

    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        zone_id: body.zone_id,
        pitch_code,
        check_in: body.check_in,
        check_out: body.check_out,
        guest_name: body.guest_name,
        guest_email: body.guest_email,
        guest_phone: body.guest_phone,
        vehicle_plate: plate,
        num_guests: body.num_guests,
        notes: body.notes || null,
        operational_notes: body.operational_notes || null,
        total_cents: body.total_cents,
        electricity: body.electricity_amperage != null,
        electricity_amperage: body.electricity_amperage ?? null,
        motorhome_over_9m: body.motorhome_over_9m ?? false,
        manual_supplement_ids: body.manual_supplement_ids ?? [],
      })
      .eq("id", id);

    if (updateError) {
      console.error("Admin reservation update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const totals = await syncReservationPaymentState(supabase, id);

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

    const guestId = await upsertGuestForReservation(supabase, {
      name: body.guest_name,
      email: body.guest_email,
      phone: body.guest_phone,
      vehicle_plate: plate,
      country: body.guest_country,
    });

    if (guestId) {
      await supabase.from("reservations").update({ guest_id: guestId }).eq("id", id);
    }

    const { data: updated } = await supabase
      .from("reservations")
      .select("status, total_cents")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      reservation_id: id,
      total_cents: updated?.total_cents ?? body.total_cents,
      paid_cents: totals.paid_cents,
      balance_cents: Math.max(0, (updated?.total_cents ?? body.total_cents) - totals.paid_cents),
      status: updated?.status ?? existing.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("id, status, pitch_id, pitch_code")
    .eq("id", id)
    .single();

  if (fetchError || !reservation) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  if (reservation.status === "checked_in") {
    await releaseReservationPitch({
      pitch_id: reservation.pitch_id,
      pitch_code: reservation.pitch_code,
    });
  }

  const { error: deleteError } = await supabase.from("reservations").delete().eq("id", id);

  if (deleteError) {
    console.error("Admin reservation delete error:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
