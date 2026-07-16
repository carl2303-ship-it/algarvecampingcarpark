import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email";
import { getEmailSecrets } from "@/lib/email-settings";
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

    const { resendApiKey } = await getEmailSecrets();
    if (!resendApiKey) {
      return NextResponse.json(
        {
          error:
            "Resend non configuré. Ajoutez la clé dans Paramètres → E-mail (Resend), ou RESEND_API_KEY sur Netlify / .env.local.",
        },
        { status: 503 }
      );
    }

    const parkSettings = await getParkSettings();
    const zoneRaw = reservation.zone as { name: string } | { name: string }[] | null;
    const zoneName = (Array.isArray(zoneRaw) ? zoneRaw[0]?.name : zoneRaw?.name) ?? "Reserva";
    const paidCents = reservation.paid_cents ?? 0;
    const totalCents = reservation.total_cents ?? 0;

    await sendBookingConfirmation({
      guestEmail: reservation.guest_email,
      guestName: reservation.guest_name,
      zoneName,
      pitchCode: reservation.pitch_code,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      checkInTime: parkSettings.check_in_time,
      checkOutTime: parkSettings.check_out_time,
      totalCents,
      paidCents,
      balanceCents: Math.max(0, totalCents - paidCents),
      reservationId: reservation.id,
      locale: reservation.locale,
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
