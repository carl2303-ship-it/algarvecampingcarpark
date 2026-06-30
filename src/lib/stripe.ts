import Stripe from "stripe";
import { SITE_NAME, SITE_URL } from "./constants";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripeInstance;
}

export async function createCheckoutSession({
  reservationId,
  totalCents,
  guestEmail,
  guestName,
  zoneName,
  checkIn,
  checkOut,
}: {
  reservationId: string;
  totalCents: number;
  guestEmail: string;
  guestName: string;
  zoneName: string;
  checkIn: string;
  checkOut: string;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${SITE_NAME} — ${zoneName}`,
            description: `Check-in: ${checkIn} | Check-out: ${checkOut}`,
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
    },
    success_url: `${SITE_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/book?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
}
