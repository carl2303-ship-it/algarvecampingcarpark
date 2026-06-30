import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;

    if (!reservationId) {
      return NextResponse.json({ error: "Missing reservation_id" }, { status: 400 });
    }

    const { data: reservation } = await supabase
      .from("reservations")
      .update({
        status: "confirmed",
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        expires_at: null,
      })
      .eq("id", reservationId)
      .eq("status", "pending_payment")
      .select("*, zone:zones(name)")
      .single();

    if (reservation) {
      await supabase
        .from("payments")
        .update({
          status: "succeeded",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
        })
        .eq("reservation_id", reservationId);

      const zoneName =
        (reservation.zone as { name: string } | null)?.name ?? "Reserva";

      await sendBookingConfirmation({
        guestEmail: reservation.guest_email,
        guestName: reservation.guest_name,
        zoneName,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        totalCents: reservation.total_cents,
        reservationId: reservation.id,
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;
    if (reservationId) {
      await supabase
        .from("reservations")
        .update({ status: "expired" })
        .eq("id", reservationId)
        .eq("status", "pending_payment");

      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("reservation_id", reservationId);
    }
  }

  return NextResponse.json({ received: true });
}
