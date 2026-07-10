import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, getCheckoutReceiptUrl } from "@/lib/stripe";
import { getStripeSecrets } from "@/lib/stripe-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation, sendPaymentReceipt } from "@/lib/email";
import { getParkSettings } from "@/lib/park-settings";
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
    const { secretKey, webhookSecret } = await getStripeSecrets();
    if (!secretKey || !webhookSecret) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;
    const isExtension = session.metadata?.type === "extension";

    if (!reservationId) {
      return NextResponse.json({ error: "Missing reservation_id" }, { status: 400 });
    }

    const receiptUrl = await getCheckoutReceiptUrl(session);
    const amountCents = session.amount_total ?? 0;

    if (isExtension) {
      const extensionCents = Number(session.metadata?.extension_cents ?? amountCents);

      const { data: reservation } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

      if (reservation) {
        const newPaid = (reservation.paid_cents ?? 0) + extensionCents;
        const paymentStatus =
          newPaid >= reservation.total_cents ? "paid_stripe" : "partial";

        await supabase
          .from("reservations")
          .update({
            paid_cents: newPaid,
            payment_status: paymentStatus,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
          })
          .eq("id", reservationId);

        await supabase
          .from("payments")
          .update({
            status: "succeeded",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
            payment_method: "stripe",
          })
          .eq("stripe_session_id", session.id);

        await sendPaymentReceipt({
          guestEmail: reservation.guest_email,
          guestName: reservation.guest_name,
          amountCents: extensionCents,
          receiptUrl,
          description: `Pagamento da extensão de estadia até ${reservation.check_out}.`,
        });
      }
    } else {
      const { data: reservation } = await supabase
        .from("reservations")
        .update({
          status: "confirmed",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          expires_at: null,
          paid_cents: amountCents,
          payment_status: "paid_stripe",
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
            payment_method: "stripe",
          })
          .eq("reservation_id", reservationId);

        const zoneName =
          (reservation.zone as { name: string } | null)?.name ?? "Reserva";

        const parkSettings = await getParkSettings();

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

        await sendPaymentReceipt({
          guestEmail: reservation.guest_email,
          guestName: reservation.guest_name,
          amountCents: amountCents,
          receiptUrl,
          description: `Pagamento da reserva em ${zoneName}.`,
        });
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;
    const isExtension = session.metadata?.type === "extension";

    if (reservationId && !isExtension) {
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

    if (reservationId && isExtension) {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_session_id", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
