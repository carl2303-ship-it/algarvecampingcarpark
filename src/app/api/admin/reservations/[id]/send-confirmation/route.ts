import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email";
import { getParkSettings } from "@/lib/park-settings";

export const dynamic = "force-dynamic";

const SENDABLE_STATUSES = new Set(["confirmed", "checked_in"]);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const supabase = createAdminClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("*, zone:zones(name)")
      .eq("id", id)
      .single();

    if (error || !reservation) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    if (!SENDABLE_STATUSES.has(reservation.status)) {
      return NextResponse.json(
        {
          error:
            "L'e-mail de confirmation ne peut être envoyé que pour une réservation confirmée ou avec arrivée effectuée.",
        },
        { status: 400 }
      );
    }

    if (!reservation.guest_email) {
      return NextResponse.json({ error: "E-mail du client manquant." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Resend non configuré. Ajoutez RESEND_API_KEY sur Netlify." },
        { status: 503 }
      );
    }

    const parkSettings = await getParkSettings();
    const zoneName = (reservation.zone as { name: string } | null)?.name ?? "Reserva";

    await sendBookingConfirmation({
      guestEmail: reservation.guest_email,
      guestName: reservation.guest_name,
      zoneName,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      checkInTime: parkSettings.check_in_time,
      checkOutTime: parkSettings.check_out_time,
      totalCents: reservation.total_cents,
      reservationId: reservation.id,
      gateAccessCode: parkSettings.gate_access_code,
    });

    return NextResponse.json({
      success: true,
      sent_to: reservation.guest_email,
    });
  } catch (error) {
    console.error("Send confirmation email error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'envoi de l'e-mail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
