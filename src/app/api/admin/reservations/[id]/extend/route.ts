import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { quoteStayExtension } from "@/lib/stay-extension";
import { createExtensionCheckoutSession } from "@/lib/stripe";
import { sendExtensionPaymentLink } from "@/lib/email";

export const dynamic = "force-dynamic";

const extendSchema = z.object({
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  send_payment_link: z.boolean().default(true),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = extendSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*, zone:zones(name)")
      .eq("id", id)
      .single();

    if (fetchError || !reservation) {
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
      const status = quote.conflict ? 409 : 400;
      return NextResponse.json(
        {
          error: quote.error ?? "Não é possível prolongar",
          conflict: quote.conflict,
        },
        { status }
      );
    }

    const extensionCents = quote.extensionCents;
    const oldCheckOut = reservation.check_out;

    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        check_out: body.check_out,
        total_cents: quote.newTotalCents,
        payment_status: extensionCents > 0 ? "partial" : reservation.payment_status,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let payment_url: string | null = null;

    if (extensionCents > 0 && body.send_payment_link) {
      try {
        const session = await createExtensionCheckoutSession({
          reservationId: id,
          extensionCents,
          guestEmail: reservation.guest_email,
          guestName: reservation.guest_name,
          pitchCode: reservation.pitch_code ?? "—",
          oldCheckOut,
          newCheckOut: body.check_out,
          applyOnPayment: false,
          locale: reservation.locale ?? "pt",
        });

        payment_url = session.url;

        await supabase.from("payments").insert({
          reservation_id: id,
          amount_cents: extensionCents,
          currency: "eur",
          status: "pending",
          stripe_session_id: session.id,
          notes: `Extensão até ${body.check_out}`,
        });

        await sendExtensionPaymentLink({
          guestEmail: reservation.guest_email,
          guestName: reservation.guest_name,
          pitchCode: reservation.pitch_code ?? "—",
          oldCheckOut,
          newCheckOut: body.check_out,
          extensionCents,
          paymentUrl: session.url!,
          locale: reservation.locale ?? "pt",
          reservationId: id,
        });
      } catch (stripeError) {
        console.error("Extension Stripe session error:", stripeError);
        return NextResponse.json({
          success: true,
          warning:
            "Estadia prolongada mas o link Stripe não foi enviado. Configure STRIPE_SECRET_KEY.",
          extension_cents: extensionCents,
          check_out: body.check_out,
        });
      }
    }

    return NextResponse.json({
      success: true,
      check_out: body.check_out,
      total_cents: quote.newTotalCents,
      extension_cents: extensionCents,
      payment_url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao prolongar estadia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
