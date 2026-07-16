import Stripe from "stripe";
import { SITE_NAME, SITE_URL, type Locale } from "./constants";
import { localePath } from "./locale-path";
import { getStripeSecrets } from "./stripe-settings";

let stripeInstance: Stripe | null = null;
let cachedSecretKey: string | null = null;

export function resetStripeClient() {
  stripeInstance = null;
  cachedSecretKey = null;
}

export async function getStripe(): Promise<Stripe> {
  const { secretKey } = await getStripeSecrets();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeInstance || cachedSecretKey !== secretKey) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
    cachedSecretKey = secretKey;
  }

  return stripeInstance;
}

export async function createCheckoutSession({
  reservationId,
  depositCents,
  totalCents,
  guestEmail,
  guestName,
  zoneName,
  pitchCode,
  checkIn,
  checkOut,
  locale = "pt",
}: {
  reservationId: string;
  depositCents: number;
  totalCents: number;
  guestEmail: string;
  guestName: string;
  zoneName: string;
  pitchCode: string;
  checkIn: string;
  checkOut: string;
  locale?: Locale;
}) {
  const stripe = await getStripe();
  const balanceCents = Math.max(0, totalCents - depositCents);
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    invoice_creation: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${SITE_NAME} — Sinal 50% · ${zoneName} · ${pitchCode}`,
            description: `Check-in: ${checkIn} | Check-out: ${checkOut} | Total: ${(totalCents / 100).toFixed(2)} € | Restante na chegada: ${(balanceCents / 100).toFixed(2)} €`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
      type: "booking_deposit",
      deposit_cents: String(depositCents),
      total_cents: String(totalCents),
      pitch_code: pitchCode,
      locale,
    },
    success_url: `${SITE_URL}${localePath(locale, "/book/success")}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}${localePath(locale, "/book")}?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
}

export async function createExtensionCheckoutSession({
  reservationId,
  extensionCents,
  guestEmail,
  guestName,
  pitchCode,
  oldCheckOut,
  newCheckOut,
  applyOnPayment = false,
  cancelUrl,
  locale = "pt",
}: {
  reservationId: string;
  extensionCents: number;
  guestEmail: string;
  guestName: string;
  pitchCode: string;
  oldCheckOut: string;
  newCheckOut: string;
  /** When true, webhook applies new check_out + total after payment (guest flow). */
  applyOnPayment?: boolean;
  cancelUrl?: string;
  locale?: Locale;
}) {
  const stripe = await getStripe();
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    invoice_creation: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${SITE_NAME} — Extensão de estadia`,
            description: `Lugar ${pitchCode}: ${oldCheckOut} → ${newCheckOut}`,
          },
          unit_amount: extensionCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
      type: "extension",
      new_check_out: newCheckOut,
      old_check_out: oldCheckOut,
      extension_cents: String(extensionCents),
      apply_on_payment: applyOnPayment ? "true" : "false",
      locale,
    },
    success_url: `${SITE_URL}${localePath(locale, "/book/success")}?session_id={CHECKOUT_SESSION_ID}&extended=1`,
    cancel_url: cancelUrl ?? `${SITE_URL}${localePath(locale, "/book")}?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  });
}

export async function getCheckoutReceiptUrl(
  session: Stripe.Checkout.Session
): Promise<string | null> {
  const stripe = await getStripe();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) return null;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const charge = paymentIntent.latest_charge;
  if (!charge || typeof charge === "string") return null;
  return charge.receipt_url ?? null;
}
