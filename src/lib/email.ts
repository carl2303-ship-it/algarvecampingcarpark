import { Resend } from "resend";
import type { Locale } from "./constants";
import { getEmailSecrets } from "./email-settings";
import { fillTemplate, getEmailCopy, resolveLocale } from "./email-i18n";
import { formatPrice } from "./pricing";
import { assertResendSent } from "./resend-assert";
import { stayManageUrl } from "./stay-token";
import { logReservationEmail } from "./reservation-emails";

function buildStayLinkBlock(reservationId: string, locale: Locale): string {
  const copy = getEmailCopy(locale).stayLink;
  try {
    const url = stayManageUrl(reservationId, locale);
    return `
      <div style="margin:24px 0;padding:16px 20px;background:#f0fdfa;border:1px solid #0f766e;border-radius:12px;">
        <p style="margin:0 0 12px;font-size:15px;color:#115e59;line-height:1.5;">
          ${copy.intro}
        </p>
        <p style="margin:0;">
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
            ${copy.cta}
          </a>
        </p>
      </div>
    `;
  } catch (error) {
    console.error("[email] stay link skipped:", error);
    return "";
  }
}

async function getResendClient(): Promise<{
  resend: Resend;
  from: string;
} | null> {
  const { resendApiKey, emailFrom } = await getEmailSecrets();
  if (!resendApiKey) return null;
  if (/@(gmail|googlemail|hotmail|outlook|yahoo)\./i.test(emailFrom)) {
    throw new Error(
      "L'expéditeur e-mail doit être un domaine vérifié Resend (ex. reservas@algarvecampingcarpark.pt). Configurez-le dans Paramètres → E-mail — Gmail/Hotmail ne sont pas acceptés."
    );
  }
  return { resend: new Resend(resendApiKey), from: emailFrom };
}

export async function sendBookingConfirmation({
  guestEmail,
  guestName,
  zoneName,
  pitchCode,
  checkIn,
  checkOut,
  checkInTime,
  checkOutTime,
  totalCents,
  paidCents,
  balanceCents,
  reservationId,
  locale,
}: {
  guestEmail: string;
  guestName: string;
  zoneName: string;
  pitchCode?: string | null;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  totalCents: number;
  paidCents?: number;
  balanceCents?: number;
  reservationId: string;
  locale?: string | null;
}) {
  const client = await getResendClient();
  if (!client) {
    throw new Error(
      "Resend non configuré — impossible d'envoyer l'e-mail de confirmation"
    );
  }

  const lang = resolveLocale(locale);
  const t = getEmailCopy(lang).confirmation;
  const paid = paidCents ?? totalCents;
  const balance = balanceCents ?? Math.max(0, totalCents - paid);
  const intro = balance > 0 ? t.introDeposit : t.introFull;
  const paidLabel = balance > 0 ? t.depositPaid : t.amountPaid;
  const balanceLine =
    balance > 0
      ? `<li><strong>${t.balanceDue}:</strong> ${formatPrice(balance)}</li>`
      : "";
  const pitchLine = pitchCode
    ? `<li><strong>${t.pitch}:</strong> ${pitchCode}</li>`
    : "";
  const stayLink = buildStayLinkBlock(reservationId, lang);

  const result = await client.resend.emails.send({
    from: client.from,
    to: guestEmail,
    subject: t.subject,
    html: `
      <h1>${t.title}</h1>
      <p>${fillTemplate(t.greeting, { name: guestName })}</p>
      <p>${intro}</p>
      <ul>
        <li><strong>${t.zone}:</strong> ${zoneName}</li>
        ${pitchLine}
        <li><strong>${t.checkIn}:</strong> ${checkIn} (${fillTemplate(t.checkInFrom, { time: checkInTime })})</li>
        <li><strong>${t.checkOut}:</strong> ${checkOut} (${fillTemplate(t.checkOutUntil, { time: checkOutTime })})</li>
        <li><strong>${t.total}:</strong> ${formatPrice(totalCents)}</li>
        <li><strong>${paidLabel}:</strong> ${formatPrice(paid)}</li>
        ${balanceLine}
        <li><strong>${t.reference}:</strong> ${reservationId.slice(0, 8).toUpperCase()}</li>
      </ul>
      <div style="margin:24px 0;padding:16px 20px;background:#fff7ed;border:2px solid #ea580c;border-radius:12px;">
        <p style="margin:0;font-size:15px;color:#9a3412;line-height:1.5;">
          <strong>${t.importantTitle}:</strong> ${t.importantBody}
        </p>
      </div>
      ${stayLink}
      <p>${fillTemplate(t.questions, { from: client.from })}</p>
    `,
  });
  assertResendSent(result, "Confirmation e-mail");
  await logReservationEmail({
    reservationId,
    emailType: "confirmation",
    sentTo: guestEmail,
    subject: t.subject,
  });
}

export async function sendBalancePaymentRequest({
  guestEmail,
  guestName,
  zoneName,
  pitchCode,
  checkIn,
  checkOut,
  balanceCents,
  totalCents,
  paidCents,
  checkoutUrl,
  reservationId,
  locale,
}: {
  guestEmail: string;
  guestName: string;
  zoneName: string;
  pitchCode?: string | null;
  checkIn: string;
  checkOut: string;
  balanceCents: number;
  totalCents: number;
  paidCents: number;
  checkoutUrl: string;
  reservationId: string;
  locale?: string | null;
}) {
  const client = await getResendClient();
  if (!client) {
    throw new Error("Resend non configuré — impossible d'envoyer l'e-mail du solde");
  }

  const lang = resolveLocale(locale);
  const t = getEmailCopy(lang).balancePayment;
  const pitchLine = pitchCode
    ? `<li><strong>${t.pitch}:</strong> ${pitchCode}</li>`
    : "";

  const result = await client.resend.emails.send({
    from: client.from,
    to: guestEmail,
    subject: t.subject,
    html: `
      <h1>${t.title}</h1>
      <p>${fillTemplate(t.greeting, { name: guestName })}</p>
      <p>${t.intro}</p>
      <ul>
        <li><strong>${t.zone}:</strong> ${zoneName}</li>
        ${pitchLine}
        <li><strong>${t.checkIn}:</strong> ${checkIn} → ${checkOut}</li>
        <li><strong>${t.total}:</strong> ${formatPrice(totalCents)}</li>
        <li><strong>${t.paid}:</strong> ${formatPrice(paidCents)}</li>
        <li><strong>${t.balance}:</strong> ${formatPrice(balanceCents)}</li>
        <li><strong>Ref.:</strong> ${reservationId.slice(0, 8).toUpperCase()}</li>
      </ul>
      <p style="margin:24px 0;">
        <a href="${checkoutUrl}" style="display:inline-block;padding:14px 28px;background:#0f766e;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
          ${t.payCta}
        </a>
      </p>
      <p style="font-size:13px;color:#64748b;">${fillTemplate(t.copyLink, { url: checkoutUrl })}</p>
      <p style="margin-top:16px;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;">${t.note}</p>
      <p>${fillTemplate(t.questions, { from: client.from })}</p>
    `,
  });
  assertResendSent(result, "Balance payment e-mail");
  await logReservationEmail({
    reservationId,
    emailType: "balance_payment",
    sentTo: guestEmail,
    subject: t.subject,
  });
}

export async function sendPreArrivalAccess({
  guestEmail,
  guestName,
  zoneName,
  pitchCode,
  checkIn,
  checkOut,
  checkInTime,
  checkOutTime,
  gateAccessCode,
  reservationId,
  locale,
}: {
  guestEmail: string;
  guestName: string;
  zoneName: string;
  pitchCode: string | null;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  gateAccessCode?: string | null;
  reservationId: string;
  locale?: string | null;
}) {
  const client = await getResendClient();
  if (!client) {
    throw new Error(
      "Resend non configuré — impossible d'envoyer l'e-mail pré-arrivée"
    );
  }

  const lang = resolveLocale(locale);
  const t = getEmailCopy(lang).preArrival;

  const gateBlock = gateAccessCode
    ? `
      <div style="margin:24px 0;padding:16px 20px;background:#ecfdf5;border:2px solid #0f766e;border-radius:12px;">
        <p style="margin:0 0 8px;font-size:14px;color:#115e59;">${t.gateLabel}</p>
        <p style="margin:0;font-size:28px;font-weight:bold;letter-spacing:4px;color:#0f766e;">${gateAccessCode}</p>
      </div>
    `
    : `
      <p style="margin:24px 0;padding:12px 16px;background:#f8fafc;border-radius:8px;">
        ${t.gateAtReception}
      </p>
    `;

  const stayLink = buildStayLinkBlock(reservationId, lang);

  const result = await client.resend.emails.send({
    from: client.from,
    to: guestEmail,
    subject: t.subject,
    html: `
      <h1>${t.title}</h1>
      <p>${fillTemplate(t.greeting, { name: guestName })}</p>
      <p>${t.intro}</p>
      <ul>
        <li><strong>${t.zone}:</strong> ${zoneName}</li>
        <li><strong>${t.pitch}:</strong> ${pitchCode ?? t.pitchPending}</li>
        <li><strong>${t.checkIn}:</strong> ${checkIn} (${fillTemplate(t.checkInFrom, { time: checkInTime })})</li>
        <li><strong>${t.checkOut}:</strong> ${checkOut} (${fillTemplate(t.checkOutUntil, { time: checkOutTime })})</li>
        <li><strong>${t.reference}:</strong> ${reservationId.slice(0, 8).toUpperCase()}</li>
      </ul>
      ${gateBlock}
      ${stayLink}
      <p>${t.closing}</p>
      <p>${fillTemplate(t.questions, { from: client.from })}</p>
    `,
  });
  assertResendSent(result, "Pré-arrivée e-mail");
  await logReservationEmail({
    reservationId,
    emailType: "pre_arrival",
    sentTo: guestEmail,
    subject: t.subject,
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
  locale,
  reservationId,
}: {
  guestEmail: string;
  guestName: string;
  pitchCode: string;
  oldCheckOut: string;
  newCheckOut: string;
  extensionCents: number;
  paymentUrl: string;
  locale?: string | null;
  reservationId?: string;
}) {
  const client = await getResendClient();
  if (!client) {
    console.log("[email] Resend not configured — skipping extension payment email");
    return;
  }

  const lang = resolveLocale(locale);
  const t = getEmailCopy(lang).extension;

  const result = await client.resend.emails.send({
    from: client.from,
    to: guestEmail,
    subject: t.subject,
    html: `
      <h1>${t.title}</h1>
      <p>${fillTemplate(t.greeting, { name: guestName })}</p>
      <p>${fillTemplate(t.intro, { pitch: pitchCode })}</p>
      <ul>
        <li><strong>${t.oldDeparture}:</strong> ${oldCheckOut}</li>
        <li><strong>${t.newDeparture}:</strong> ${newCheckOut}</li>
        <li><strong>${t.amount}:</strong> ${formatPrice(extensionCents)}</li>
      </ul>
      <p><a href="${paymentUrl}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">${t.payCta}</a></p>
      <p>${fillTemplate(t.copyLink, { url: paymentUrl })}</p>
      <p>${fillTemplate(t.questions, { from: client.from })}</p>
    `,
  });
  assertResendSent(result, "Extension e-mail");
  if (reservationId) {
    await logReservationEmail({
      reservationId,
      emailType: "extension_link",
      sentTo: guestEmail,
      subject: t.subject,
    });
  }
}

export async function sendPaymentReceipt({
  guestEmail,
  guestName,
  amountCents,
  receiptUrl,
  description,
  locale,
  reservationId,
}: {
  guestEmail: string;
  guestName: string;
  amountCents: number;
  receiptUrl: string | null;
  description: string;
  locale?: string | null;
  reservationId?: string;
}) {
  const client = await getResendClient();
  if (!client) {
    console.log("[email] Resend not configured — skipping receipt email");
    return;
  }

  const lang = resolveLocale(locale);
  const t = getEmailCopy(lang).receipt;

  const receiptBlock = receiptUrl
    ? `<p><a href="${receiptUrl}">${t.viewReceipt}</a></p>`
    : `<p>${t.receiptLater}</p>`;

  const result = await client.resend.emails.send({
    from: client.from,
    to: guestEmail,
    subject: t.subject,
    html: `
      <h1>${t.title}</h1>
      <p>${fillTemplate(t.greeting, { name: guestName })}</p>
      <p>${description}</p>
      <p><strong>${t.amount}:</strong> ${formatPrice(amountCents)}</p>
      ${receiptBlock}
      <p>${t.thanks}</p>
    `,
  });
  assertResendSent(result, "Reçu e-mail");
  if (reservationId) {
    await logReservationEmail({
      reservationId,
      emailType: "payment_receipt",
      sentTo: guestEmail,
      subject: t.subject,
    });
  }
}

/** Build localized receipt description helpers for callers. */
export function receiptDepositDescription(
  locale: string | null | undefined,
  zoneName: string,
  pitchCode?: string | null
): string {
  const t = getEmailCopy(locale).receipt;
  const pitch = pitchCode ? ` (${pitchCode})` : "";
  return fillTemplate(t.depositDescription, { zone: zoneName, pitch });
}

export function receiptBalanceDescription(
  locale: string | null | undefined,
  zoneName: string,
  pitchCode?: string | null
): string {
  const t = getEmailCopy(locale).receipt;
  const pitch = pitchCode ? ` (${pitchCode})` : "";
  return fillTemplate(t.balanceDescription, { zone: zoneName, pitch });
}

export function receiptExtensionDescription(
  locale: string | null | undefined,
  date: string
): string {
  const t = getEmailCopy(locale).receipt;
  return fillTemplate(t.extensionDescription, { date });
}
