import Stripe from "stripe";
import { SITE_NAME, SITE_URL, type Locale } from "./constants";
import { localePath } from "./locale-path";
import { getStripeSecrets } from "./stripe-settings";

/** Stripe Checkout: expires_at must be 30 min–24 h from session creation. */
const CHECKOUT_EXPIRES_IN_SECONDS = {
  bookingDeposit: 30 * 60,
  /** Max allowed by Stripe (just under 24h). */
  max: 24 * 60 * 60 - 60,
} as const;

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
  vehiclePlate,
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
  vehiclePlate?: string | null;
  locale?: Locale;
  gateEntry?: boolean;
}) {
  const stripe = await getStripe();
  const plate = vehiclePlate?.trim() || "";
  const platePart = plate ? `Matrícula: ${plate} | ` : "";
  const productName = `${SITE_NAME} — Paiement intégral · ${zoneName} · ${pitchCode}${
    plate ? ` · ${plate}` : ""
  }`;
  const productDescription = `${platePart}Check-in: ${checkIn} | Check-out: ${checkOut} | Total: ${(totalCents / 100).toFixed(2)} €`;
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
    payment_intent_data: {
      description: productDescription,
      metadata: {
        reservation_id: reservationId,
        vehicle_plate: plate,
        pitch_code: pitchCode,
      },
    },
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
      type: "booking_full",
      deposit_cents: String(depositCents),
      total_cents: String(totalCents),
      pitch_code: pitchCode,
      vehicle_plate: plate,
      gate_entry: gateEntry ? "1" : "0",
      locale,
    },
    success_url: `${SITE_URL}${localePath(locale, "/book/success")}?session_id={CHECKOUT_SESSION_ID}${gateEntry ? "&from=qr" : ""}`,
    cancel_url: `${SITE_URL}${cancelPath}`,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_IN_SECONDS.bookingDeposit,
  });
}

/** Remaining balance for legacy partial bookings — sent ~48h before arrival. */
export async function createBalanceCheckoutSession({
  reservationId,
  balanceCents,
  guestEmail,
  guestName,
  zoneName,
  pitchCode,
  checkIn,
  checkOut,
  vehiclePlate,
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
  vehiclePlate?: string | null;
  locale?: Locale;
}) {
  const stripe = await getStripe();
  const plate = vehiclePlate?.trim() || "";
  const platePart = plate ? `Matrícula: ${plate} | ` : "";
  const pitch = pitchCode ? ` · ${pitchCode}` : "";
  const plateInName = plate ? ` · ${plate}` : "";
  const productDescription = `${platePart}Check-in: ${checkIn} | Check-out: ${checkOut} | Zone: ${zoneName}`;
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    invoice_creation: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${SITE_NAME} — Solde${pitch}${plateInName}`,
            description: productDescription,
          },
          unit_amount: balanceCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      description: productDescription,
      metadata: {
        reservation_id: reservationId,
        vehicle_plate: plate,
        pitch_code: pitchCode ?? "",
      },
    },
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
      type: "booking_balance",
      balance_cents: String(balanceCents),
      pitch_code: pitchCode ?? "",
      vehicle_plate: plate,
      locale,
    },
    success_url: `${SITE_URL}${localePath(locale, "/book/success")}?session_id={CHECKOUT_SESSION_ID}&balance=1`,
    cancel_url: `${SITE_URL}${localePath(locale, "/book")}?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_IN_SECONDS.max,
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
  vehiclePlate,
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
  vehiclePlate?: string | null;
  /** When true, webhook applies new check_out + total after payment (guest flow). */
  applyOnPayment?: boolean;
  cancelUrl?: string;
  locale?: Locale;
}) {
  const stripe = await getStripe();
  const plate = vehiclePlate?.trim() || "";
  const platePart = plate ? `Matrícula: ${plate} | ` : "";
  const productDescription = `${platePart}Lugar ${pitchCode}: ${oldCheckOut} → ${newCheckOut}`;
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    invoice_creation: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${SITE_NAME} — Extensão de estadia${plate ? ` · ${plate}` : ""}`,
            description: productDescription,
          },
          unit_amount: extensionCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      description: productDescription,
      metadata: {
        reservation_id: reservationId,
        vehicle_plate: plate,
        pitch_code: pitchCode,
      },
    },
    metadata: {
      reservation_id: reservationId,
      guest_name: guestName,
      type: "extension",
      new_check_out: newCheckOut,
      old_check_out: oldCheckOut,
      extension_cents: String(extensionCents),
      apply_on_payment: applyOnPayment ? "true" : "false",
      vehicle_plate: plate,
      locale,
    },
    success_url: `${SITE_URL}${localePath(locale, "/book/success")}?session_id={CHECKOUT_SESSION_ID}&extended=1`,
    cancel_url: cancelUrl ?? `${SITE_URL}${localePath(locale, "/book")}?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_IN_SECONDS.max,
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
