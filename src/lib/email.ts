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
  totalCents,
  reservationId,
}: {
  guestEmail: string;
  guestName: string;
  zoneName: string;
  checkIn: string;
  checkOut: string;
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
        <li><strong>Check-in:</strong> ${checkIn} (a partir das 14:00)</li>
        <li><strong>Check-out:</strong> ${checkOut} (até às 12:00)</li>
        <li><strong>Total pago:</strong> ${formatPrice(totalCents)}</li>
        <li><strong>Referência:</strong> ${reservationId.slice(0, 8).toUpperCase()}</li>
      </ul>
      <p>O lugar específico será atribuído na chegada. Apresente esta confirmação na receção.</p>
      <p>Questões? Contacte-nos: ${CONTACT_EMAIL}</p>
    `,
  });
}
