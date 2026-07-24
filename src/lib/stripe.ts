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
  gateEntry = false,
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
  gateEntry?: boolean;
}) {
  const stripe = await getStripe();
  const balanceCents = Math.max(0, totalCents - depositCents);
  const fullPayment = gateEntry || balanceCents === 0;
  const productName = fullPayment
    ? `${SITE_NAME} — Paiement intégral · ${zoneName} · ${pitchCode}`
    : `${SITE_NAME} — Acompte 50% · ${zoneName} · ${pitchCode}`;
  const productDescription = fullPayment
    ? `Check-in: ${checkIn} | Check-out: ${checkOut} | Total payé: ${(totalCents / 100).toFixed(2)} €`
    : `Check-in: ${checkIn} | Check-out: ${checkOut} | Total: ${(totalCents / 100).toFixed(2)} € | Solde à régler en ligne 48 h avant l'arrivée: ${(balanceCents / 100).toFixed(2)} €`;
  const cancelPath = gateEntry
    ? `${localePath(locale, "/book")}?from=qr&cancelled=1`
    : `${localePath(locale, "/book")}?cancelled=1`;

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    invoice_creation: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: productName,
            description: productDescription,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
      type: fullPayment ? "booking_full" : "booking_deposit",
      deposit_cents: String(depositCents),
      total_cents: String(totalCents),
      pitch_code: pitchCode,
      gate_entry: gateEntry ? "1" : "0",
      locale,
    },
    success_url: `${SITE_URL}${localePath(locale, "/book/success")}?session_id={CHECKOUT_SESSION_ID}${gateEntry ? "&from=qr" : ""}`,
    cancel_url: `${SITE_URL}${cancelPath}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
}

/** Remaining 50% balance — sent ~48h before arrival. */
export async function createBalanceCheckoutSession({
  reservationId,
  balanceCents,
  guestEmail,
  guestName,
  zoneName,
  pitchCode,
  checkIn,
  checkOut,
  locale = "pt",
}: {
  reservationId: string;
  balanceCents: number;
  guestEmail: string;
  guestName: string;
  zoneName: string;
  pitchCode: string | null;
  checkIn: string;
  checkOut: string;
  locale?: Locale;
}) {
  const stripe = await getStripe();
  const pitch = pitchCode ? ` · ${pitchCode}` : "";
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    invoice_creation: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${SITE_NAME} — Solde 50%${pitch}`,
            description: `Check-in: ${checkIn} | Check-out: ${checkOut} | Zone: ${zoneName}`,
          },
          unit_amount: balanceCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
      type: "booking_balance",
      balance_cents: String(balanceCents),
      pitch_code: pitchCode ?? "",
      locale,
    },
    success_url: `${SITE_URL}${localePath(locale, "/book/success")}?session_id={CHECKOUT_SESSION_ID}&balance=1`,
    cancel_url: `${SITE_URL}${localePath(locale, "/book")}?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
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
