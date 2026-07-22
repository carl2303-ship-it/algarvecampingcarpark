import { NextResponse } from "next/server";
import { z } from "zod";
import { validatePitchBookingAvailability } from "@/lib/availability";
import { getPricingSupplements } from "@/lib/pricing-supplements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe";
import {
  PENDING_PAYMENT_EXPIRY_MINUTES,
  bookingDepositRatio,
} from "@/lib/constants";
import { getParkSettings, isOnlineBookingOpen } from "@/lib/park-settings";
import { normalizeVehiclePlate } from "@/lib/admin-reservation-payments";
import { findActiveReservationByPlate } from "@/lib/vehicle-plate-lookup";
import { localePath } from "@/lib/locale-path";

const bookingSchema = z.object({
  zone_id: z.string().uuid(),
  pitch_code: z.string().min(1).max(10),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().min(2).max(100),
  guest_email: z.string().email(),
  guest_phone: z.string().min(6).max(20),
  vehicle_plate: z.string().min(1).max(20),
  num_guests: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
  locale: z.enum(["pt", "en", "fr", "de", "es"]).optional().default("pt"),
  gate_entry: z.boolean().optional(),
  reception_entry: z.boolean().optional(),
  over_9m: z.boolean().optional(),
  electricity_amperage: z.union([z.literal(6), z.literal(10)]).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const gateEntry = body?.gate_entry === true;
  const receptionEntry = body?.reception_entry === true && !gateEntry;
  const parkSettings = await getParkSettings();

  if (!isOnlineBookingOpen(parkSettings) && !gateEntry && !receptionEntry) {
    return NextResponse.json(
      {
        error:
          "As reservas online estão temporariamente indisponíveis. Contacte-nos para verificar disponibilidade.",
      },
      { status: 503 }
    );
  }

  try {
    const data = bookingSchema.parse(body);
    const pitchCode = data.pitch_code.toUpperCase();

    const withElectricity = data.electricity_amperage != null;

    const supplements = await getPricingSupplements();

    const { available, pricing, pitch, zone } = await validatePitchBookingAvailability({
      zoneId: data.zone_id,
      pitchCode,
      checkIn: data.check_in,
      checkOut: data.check_out,
      numGuests: data.num_guests,
      electric: withElectricity,
      over9m: data.over_9m,
      electricityAmperage: withElectricity ? (data.electricity_amperage ?? 6) : null,
      supplements,
    });

    if (!available || !pitch || !zone) {
      return NextResponse.json(
        { error: "Lugar indisponível para as datas selecionadas" },
        { status: 409 }
      );
    }

    if (pricing.totalCents < 50) {
      return NextResponse.json({ error: "Valor de reserva inválido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const plate = normalizeVehiclePlate(data.vehicle_plate);

    if (!plate) {
      return NextResponse.json({ error: "Indique a matrícula do veículo" }, { status: 400 });
    }

    const activeForPlate = await findActiveReservationByPlate(supabase, plate);
    if (activeForPlate) {
      return NextResponse.json(
        {
          error:
            "Já existe uma reserva activa para esta matrícula. Não é possível criar outra até terminar a actual.",
          active_reservation: {
            check_in: activeForPlate.check_in,
            check_out: activeForPlate.check_out,
            pitch_code: activeForPlate.pitch_code,
          },
        },
        { status: 409 }
      );
    }

    const { data: pitchRow } = await supabase
      .from("pitches")
      .select("id")
      .eq("code", pitchCode)
      .eq("zone_id", data.zone_id)
      .maybeSingle();

    const entryNote = gateEntry
      ? "[Entrada QR portão]"
      : receptionEntry
        ? "[QR receção — pagamento no balcão]"
        : null;
    const notes = [data.notes, entryNote].filter(Boolean).join("\n") || null;

    if (receptionEntry) {
      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .insert({
          zone_id: data.zone_id,
          pitch_id: pitchRow?.id ?? null,
          pitch_code: pitchCode,
          check_in: data.check_in,
          check_out: data.check_out,
          status: "confirmed",
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          guest_phone: data.guest_phone,
          vehicle_plate: plate,
          num_guests: data.num_guests,
          notes,
          total_cents: pricing.totalCents,
          paid_cents: 0,
          payment_status: "pending",
          electricity: withElectricity,
          electricity_amperage: withElectricity ? (data.electricity_amperage ?? 6) : null,
          expires_at: null,
          locale: data.locale,
        })
        .select("id")
        .single();

      if (resError || !reservation) {
        console.error("Reception reservation insert error:", resError);
        return NextResponse.json({ error: "Erro ao criar reserva" }, { status: 500 });
      }

      const reference = reservation.id.slice(0, 8).toUpperCase();
      const redirectPath = `${localePath(data.locale, "/book/success")}?from=reception&ref=${encodeURIComponent(reference)}`;

      return NextResponse.json({
        reservation_id: reservation.id,
        reference,
        redirect_url: redirectPath,
      });
    }

    const depositCents = Math.round(pricing.totalCents * bookingDepositRatio(gateEntry));
    if (depositCents < 50) {
      return NextResponse.json({ error: "Valor de reserva inválido" }, { status: 400 });
    }

    const expiresAt = new Date(
      Date.now() + PENDING_PAYMENT_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .insert({
        zone_id: data.zone_id,
        pitch_id: pitchRow?.id ?? null,
        pitch_code: pitchCode,
        check_in: data.check_in,
        check_out: data.check_out,
        status: "pending_payment",
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone,
        vehicle_plate: plate,
        num_guests: data.num_guests,
        notes,
        total_cents: pricing.totalCents,
        paid_cents: 0,
        payment_status: "pending",
        electricity: withElectricity,
        electricity_amperage: withElectricity ? (data.electricity_amperage ?? 6) : null,
        expires_at: expiresAt,
        locale: data.locale,
      })
      .select("*, zone:zones(name)")
      .single();

    if (resError || !reservation) {
      console.error("Reservation insert error:", resError);
      return NextResponse.json({ error: "Erro ao criar reserva" }, { status: 500 });
    }

    const zoneName =
      (reservation.zone as { name: string } | null)?.name ?? zone.name ?? "Reserva";

    const session = await createCheckoutSession({
      reservationId: reservation.id,
      depositCents,
      totalCents: pricing.totalCents,
      guestEmail: data.guest_email,
      guestName: data.guest_name,
      zoneName,
      pitchCode,
      checkIn: data.check_in,
      checkOut: data.check_out,
      locale: data.locale,
      gateEntry,
    });

    await supabase
      .from("reservations")
      .update({ stripe_session_id: session.id })
      .eq("id", reservation.id);

    await supabase.from("payments").insert({
      reservation_id: reservation.id,
      stripe_session_id: session.id,
      amount_cents: depositCents,
      status: "pending",
      notes: gateEntry
        ? "Paiement intégral (entrée QR portail)"
        : "Sinal 50% (reserva online)",
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Erro ao processar reserva" }, { status: 500 });
  }
}
