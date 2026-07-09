import { Resend } from "resend";
import { CONTACT_EMAIL, SITE_NAME } from "./constants";
import { formatPrice } from "./pricing";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendBookingConfirmation({
  guestEmail,
  guestName,
  zoneName,
  checkIn,
  checkOut,
  checkInTime,
  checkOutTime,
  totalCents,
  reservationId,
}: {
  guestEmail: string;
  guestName: string;
  zoneName: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  totalCents: number;
  reservationId: string;
}) {
  if (!resend) {
    console.log("[email] Resend not configured — skipping confirmation email");
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? CONTACT_EMAIL,
    to: guestEmail,
    subject: `Reserva confirmada — ${SITE_NAME}`,
    html: `
      <h1>Reserva confirmada!</h1>
      <p>Olá ${guestName},</p>
      <p>A sua reserva no <strong>${SITE_NAME}</strong> foi confirmada.</p>
      <ul>
        <li><strong>Zona:</strong> ${zoneName}</li>
        <li><strong>Check-in:</strong> ${checkIn} (a partir das ${checkInTime})</li>
        <li><strong>Check-out:</strong> ${checkOut} (até às ${checkOutTime})</li>
        <li><strong>Total pago:</strong> ${formatPrice(totalCents)}</li>
        <li><strong>Referência:</strong> ${reservationId.slice(0, 8).toUpperCase()}</li>
      </ul>
      <p>O lugar específico será atribuído na chegada. Apresente esta confirmação na receção.</p>
      <p>Questões? Contacte-nos: ${CONTACT_EMAIL}</p>
    `,
  });
}

export async function sendExtensionPaymentLink({
  guestEmail,
  guestName,
  pitchCode,
  oldCheckOut,
  newCheckOut,
  extensionCents,
  paymentUrl,
}: {
  guestEmail: string;
  guestName: string;
  pitchCode: string;
  oldCheckOut: string;
  newCheckOut: string;
  extensionCents: number;
  paymentUrl: string;
}) {
  if (!resend) {
    console.log("[email] Resend not configured — skipping extension payment email");
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? CONTACT_EMAIL,
    to: guestEmail,
    subject: `Extensão de estadia — ${SITE_NAME}`,
    html: `
      <h1>Extensão de estadia</h1>
      <p>Olá ${guestName},</p>
      <p>A sua estadia no lugar <strong>${pitchCode}</strong> foi prolongada.</p>
      <ul>
        <li><strong>Partida anterior:</strong> ${oldCheckOut}</li>
        <li><strong>Nova partida:</strong> ${newCheckOut}</li>
        <li><strong>Valor adicional:</strong> ${formatPrice(extensionCents)}</li>
      </ul>
      <p><a href="${paymentUrl}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Pagar extensão</a></p>
      <p>Ou copie este link: ${paymentUrl}</p>
      <p>Questões? ${CONTACT_EMAIL}</p>
    `,
  });
}

export async function sendPaymentReceipt({
  guestEmail,
  guestName,
  amountCents,
  receiptUrl,
  description,
}: {
  guestEmail: string;
  guestName: string;
  amountCents: number;
  receiptUrl: string | null;
  description: string;
}) {
  if (!resend) {
    console.log("[email] Resend not configured — skipping receipt email");
    return;
  }

  const receiptBlock = receiptUrl
    ? `<p><a href="${receiptUrl}">Ver recibo / fatura Stripe</a></p>`
    : "<p>O recibo ficará disponível na sua conta Stripe.</p>";

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? CONTACT_EMAIL,
    to: guestEmail,
    subject: `Recibo de pagamento — ${SITE_NAME}`,
    html: `
      <h1>Pagamento confirmado</h1>
      <p>Olá ${guestName},</p>
      <p>${description}</p>
      <p><strong>Valor:</strong> ${formatPrice(amountCents)}</p>
      ${receiptBlock}
      <p>Obrigado pela sua estadia no ${SITE_NAME}.</p>
    `,
  });
}
