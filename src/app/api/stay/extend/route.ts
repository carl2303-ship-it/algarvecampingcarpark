import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import { getReservationForStay, quoteStayExtension } from "@/lib/stay-extension";
import { createStayToken, verifyStayToken } from "@/lib/stay-token";
import { createExtensionCheckoutSession } from "@/lib/stripe";
import { localePath } from "@/lib/locale-path";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(10),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.enum(["pt", "en", "fr", "de", "es"]).optional().default("pt"),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const payload = verifyStayToken(body.token);
    if (!payload) {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 401 });
    }

    const reservation = await getReservationForStay(payload.reservationId);
    if (!reservation) {
      return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    }

    const quote = await quoteStayExtension({
      reservation: {
        id: reservation.id,
        status: reservation.status,
        zone_id: reservation.zone_id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        total_cents: reservation.total_cents,
        num_guests: reservation.num_guests,
        pitch_code: reservation.pitch_code,
      },
      newCheckOut: body.check_out,
    });

    if (!quote.available) {
      return NextResponse.json(
        {
          error: quote.error ?? "Não é possível prolongar",
          conflict: quote.conflict,
        },
        { status: quote.conflict ? 409 : 400 }
      );
    }

    if (quote.extensionCents <= 0) {
      return NextResponse.json(
        { error: "Não há valor a pagar para esta extensão" },
        { status: 400 }
      );
    }

    const cancelToken = createStayToken(reservation.id);
    const cancelUrl = `${SITE_URL}${localePath(body.locale as Locale, `/stay/${encodeURIComponent(cancelToken)}`)}?cancelled=1`;

    const session = await createExtensionCheckoutSession({
      reservationId: reservation.id,
      extensionCents: quote.extensionCents,
      guestEmail: reservation.guest_email,
      guestName: reservation.guest_name,
      pitchCode: reservation.pitch_code ?? "—",
      oldCheckOut: quote.oldCheckOut,
      newCheckOut: quote.newCheckOut,
      applyOnPayment: true,
      cancelUrl,
      locale: body.locale as Locale,
    });

    const supabase = createAdminClient();
    await supabase.from("payments").insert({
      reservation_id: reservation.id,
      amount_cents: quote.extensionCents,
      currency: "eur",
      status: "pending",
      stripe_session_id: session.id,
      notes: `Extensão online até ${quote.newCheckOut} (aguarda pagamento)`,
    });

    return NextResponse.json({
      payment_url: session.url,
      extension_cents: quote.extensionCents,
      new_check_out: quote.newCheckOut,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Stay extend error:", error);
    const message = error instanceof Error ? error.message : "Erro ao iniciar extensão";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
