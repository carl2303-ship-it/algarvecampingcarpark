import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBookingAvailability } from "@/lib/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe";
import { PENDING_PAYMENT_EXPIRY_MINUTES } from "@/lib/constants";

const bookingSchema = z.object({
  zone_id: z.string().uuid(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().min(2).max(100),
  guest_email: z.string().email(),
  guest_phone: z.string().min(6).max(20),
  vehicle_plate: z.string().max(20).optional(),
  num_guests: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = bookingSchema.parse(body);

    const { available, pricing } = await validateBookingAvailability(
      data.zone_id,
      data.check_in,
      data.check_out,
      data.num_guests
    );

    if (!available) {
      return NextResponse.json(
        { error: "Zona indisponível para as datas selecionadas" },
        { status: 409 }
      );
    }

    const supabase = createAdminClient();

    const expiresAt = new Date(
      Date.now() + PENDING_PAYMENT_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .insert({
        zone_id: data.zone_id,
        check_in: data.check_in,
        check_out: data.check_out,
        status: "pending_payment",
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone,
        vehicle_plate: data.vehicle_plate ?? null,
        num_guests: data.num_guests,
        notes: data.notes ?? null,
        total_cents: pricing.totalCents,
        expires_at: expiresAt,
      })
      .select("*, zone:zones(name)")
      .single();

    if (resError || !reservation) {
      console.error("Reservation insert error:", resError);
      return NextResponse.json(
        { error: "Erro ao criar reserva" },
        { status: 500 }
      );
    }

    const zoneName =
      (reservation.zone as { name: string } | null)?.name ?? "Reserva";

    const session = await createCheckoutSession({
      reservationId: reservation.id,
      totalCents: pricing.totalCents,
      guestEmail: data.guest_email,
      guestName: data.guest_name,
      zoneName,
      checkIn: data.check_in,
      checkOut: data.check_out,
    });

    await supabase
      .from("reservations")
      .update({ stripe_session_id: session.id })
      .eq("id", reservation.id);

    await supabase.from("payments").insert({
      reservation_id: reservation.id,
      stripe_session_id: session.id,
      amount_cents: pricing.totalCents,
      status: "pending",
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
