import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, getCheckoutReceiptUrl } from "@/lib/stripe";
import { getStripeSecrets } from "@/lib/stripe-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  receiptDepositDescription,
  receiptExtensionDescription,
  sendBookingConfirmation,
  sendPaymentReceipt,
} from "@/lib/email";
import { resolveLocale } from "@/lib/email-i18n";
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
      const applyOnPayment = session.metadata?.apply_on_payment === "true";
      const newCheckOut = session.metadata?.new_check_out;

      const { data: reservation } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

      if (reservation) {
        const newPaid = (reservation.paid_cents ?? 0) + extensionCents;

        let nextTotal = reservation.total_cents;
        let nextCheckOut = reservation.check_out;

        if (applyOnPayment && newCheckOut && newCheckOut > reservation.check_out) {
          const { quoteStayExtension } = await import("@/lib/stay-extension");
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
            newCheckOut,
          });

          if (quote.available) {
            nextCheckOut = newCheckOut;
            nextTotal = quote.newTotalCents;
          } else {
            console.error("Extension webhook conflict after payment:", quote.error, quote.conflict);
          }
        }

        const paymentStatus = newPaid >= nextTotal ? "paid_stripe" : "partial";

        await supabase
          .from("reservations")
          .update({
            check_out: nextCheckOut,
            total_cents: nextTotal,
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
          description: receiptExtensionDescription(
            resolveLocale(reservation.locale ?? session.metadata?.locale),
            nextCheckOut
          ),
          locale: resolveLocale(reservation.locale ?? session.metadata?.locale),
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
          payment_status:
            amountCents >= (Number(session.metadata?.total_cents) || amountCents)
              ? "paid_stripe"
              : "partial",
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
        const totalCents = reservation.total_cents ?? amountCents;
        const balanceCents = Math.max(0, totalCents - amountCents);
        const locale = resolveLocale(reservation.locale ?? session.metadata?.locale);

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
          paidCents: amountCents,
          balanceCents,
          reservationId: reservation.id,
          locale,
        });

        await sendPaymentReceipt({
          guestEmail: reservation.guest_email,
          guestName: reservation.guest_name,
          amountCents: amountCents,
          receiptUrl,
          description: receiptDepositDescription(
            locale,
            zoneName,
            reservation.pitch_code
          ),
          locale,
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
