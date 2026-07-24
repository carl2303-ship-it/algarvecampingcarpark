import { SITE_NAME, isLocale, type Locale } from "@/lib/constants";

export type EmailCopy = {
  confirmation: {
    subject: string;
    title: string;
    greeting: string;
    introDeposit: string;
    introFull: string;
    zone: string;
    pitch: string;
    checkIn: string;
    checkInFrom: string;
    checkOut: string;
    checkOutUntil: string;
    total: string;
    depositPaid: string;
    amountPaid: string;
    balanceDue: string;
    reference: string;
    importantTitle: string;
    importantBody: string;
    questions: string;
  };
  balancePayment: {
    subject: string;
    title: string;
    greeting: string;
    intro: string;
    zone: string;
    pitch: string;
    checkIn: string;
    total: string;
    paid: string;
    balance: string;
    payCta: string;
    copyLink: string;
    note: string;
    questions: string;
  };
  preArrival: {
    subject: string;
    title: string;
    greeting: string;
    intro: string;
    zone: string;
    pitch: string;
    pitchPending: string;
    checkIn: string;
    checkInFrom: string;
    checkOut: string;
    checkOutUntil: string;
    reference: string;
    gateLabel: string;
    gateAtReception: string;
    closing: string;
    questions: string;
  };
  stayLink: {
    intro: string;
    cta: string;
  };
  extension: {
    subject: string;
    title: string;
    greeting: string;
    intro: string;
    oldDeparture: string;
    newDeparture: string;
    amount: string;
    payCta: string;
    copyLink: string;
    questions: string;
  };
  receipt: {
    subject: string;
    title: string;
    greeting: string;
    amount: string;
    viewReceipt: string;
    receiptLater: string;
    thanks: string;
    depositDescription: string;
    balanceDescription: string;
    extensionDescription: string;
  };
};

const pt: EmailCopy = {
  confirmation: {
    subject: `Reserva confirmada — ${SITE_NAME}`,
    title: "Reserva confirmada!",
    greeting: "Olá {name},",
    introDeposit: `A sua reserva no <strong>${SITE_NAME}</strong> foi confirmada com o pagamento do sinal de 50%. O restante será pedido por email com link Stripe cerca de 48 horas antes da chegada.`,
    introFull: `A sua reserva no <strong>${SITE_NAME}</strong> foi confirmada com o pagamento integral (obrigatório para chegadas a menos de 48 horas).`,
    zone: "Zona",
    pitch: "Lugar reservado",
    checkIn: "Check-in",
    checkInFrom: "a partir das {time}",
    checkOut: "Check-out",
    checkOutUntil: "até às {time}",
    total: "Total da estadia",
    depositPaid: "Sinal pago (50%)",
    amountPaid: "Valor pago",
    balanceDue: "Restante (link Stripe ~48h antes da chegada)",
    reference: "Referência",
    importantTitle: "Importante",
    importantBody:
      "o lugar e o código da barreira só são enviados por email após o pagamento a <strong>100%</strong>, tipicamente nas 24 horas antes da chegada.",
    questions: "Questões? Contacte-nos: {from}",
  },
  balancePayment: {
    subject: `Pagamento do restante — ${SITE_NAME}`,
    title: "Complete o pagamento da sua reserva",
    greeting: "Olá {name},",
    intro:
      "A sua chegada aproxima-se. Por favor pague os 50% restantes online para receber o código de entrada da barreira.",
    zone: "Zona",
    pitch: "Lugar",
    checkIn: "Check-in",
    total: "Total da estadia",
    paid: "Já pago",
    balance: "Valor a pagar agora",
    payCta: "Pagar o restante",
    copyLink: "Ou copie este link: {url}",
    note: "Sem o pagamento a 100% não enviamos o código de entrada.",
    questions: "Questões? Contacte-nos: {from}",
  },
  preArrival: {
    subject: `Amanhã no parque — lugar e acesso · ${SITE_NAME}`,
    title: "Informações de chegada",
    greeting: "Olá {name},",
    intro: "A sua chegada está prevista para amanhã. Aqui estão os dados definitivos:",
    zone: "Zona",
    pitch: "Lugar",
    pitchPending: "A atribuir na receção",
    checkIn: "Check-in",
    checkInFrom: "a partir das {time}",
    checkOut: "Check-out",
    checkOutUntil: "até às {time}",
    reference: "Referência",
    gateLabel: "Código para abrir a barreira do parque:",
    gateAtReception: "O código da barreira será indicado na receção à chegada.",
    closing: `Bom caminho e até breve no ${SITE_NAME}.`,
    questions: "Questões? {from}",
  },
  stayLink: {
    intro:
      "Precisa de ficar mais noites? Pode prolongar a estadia online (sujeito a disponibilidade do lugar):",
    cta: "Prolongar estadia",
  },
  extension: {
    subject: `Extensão de estadia — ${SITE_NAME}`,
    title: "Extensão de estadia",
    greeting: "Olá {name},",
    intro: "A sua estadia no lugar <strong>{pitch}</strong> foi prolongada.",
    oldDeparture: "Partida anterior",
    newDeparture: "Nova partida",
    amount: "Valor adicional",
    payCta: "Pagar extensão",
    copyLink: "Ou copie este link: {url}",
    questions: "Questões? {from}",
  },
  receipt: {
    subject: `Recibo de pagamento — ${SITE_NAME}`,
    title: "Pagamento confirmado",
    greeting: "Olá {name},",
    amount: "Valor",
    viewReceipt: "Ver recibo / fatura Stripe",
    receiptLater: "O recibo ficará disponível na sua conta Stripe.",
    thanks: `Obrigado pela sua estadia no ${SITE_NAME}.`,
    depositDescription:
      "Sinal de 50% da reserva em {zone}{pitch}.",
    balanceDescription: "Pagamento do restante (50%) da reserva em {zone}{pitch}.",
    extensionDescription: "Pagamento da extensão de estadia até {date}.",
  },
};

const en: EmailCopy = {
  confirmation: {
    subject: `Booking confirmed — ${SITE_NAME}`,
    title: "Booking confirmed!",
    greeting: "Hello {name},",
    introDeposit: `Your booking at <strong>${SITE_NAME}</strong> has been confirmed with the 50% deposit. The remaining balance will be requested by email with a Stripe link about 48 hours before arrival.`,
    introFull: `Your booking at <strong>${SITE_NAME}</strong> has been confirmed with full payment (required for arrivals within 48 hours).`,
    zone: "Zone",
    pitch: "Reserved pitch",
    checkIn: "Check-in",
    checkInFrom: "from {time}",
    checkOut: "Check-out",
    checkOutUntil: "by {time}",
    total: "Stay total",
    depositPaid: "Deposit paid (50%)",
    amountPaid: "Amount paid",
    balanceDue: "Balance (Stripe link ~48h before arrival)",
    reference: "Reference",
    importantTitle: "Important",
    importantBody:
      "your pitch and barrier access code are only emailed after <strong>100%</strong> payment, typically within 24 hours before arrival.",
    questions: "Questions? Contact us: {from}",
  },
  balancePayment: {
    subject: `Pay the remaining balance — ${SITE_NAME}`,
    title: "Complete your booking payment",
    greeting: "Hello {name},",
    intro:
      "Your arrival is approaching. Please pay the remaining 50% online to receive the barrier access code.",
    zone: "Zone",
    pitch: "Pitch",
    checkIn: "Check-in",
    total: "Stay total",
    paid: "Already paid",
    balance: "Amount due now",
    payCta: "Pay the balance",
    copyLink: "Or copy this link: {url}",
    note: "Without 100% payment we cannot send the entry code.",
    questions: "Questions? Contact us: {from}",
  },
  preArrival: {
    subject: `Tomorrow at the park — pitch and access · ${SITE_NAME}`,
    title: "Arrival information",
    greeting: "Hello {name},",
    intro: "Your arrival is scheduled for tomorrow. Here are the final details:",
    zone: "Zone",
    pitch: "Pitch",
    pitchPending: "To be assigned at reception",
    checkIn: "Check-in",
    checkInFrom: "from {time}",
    checkOut: "Check-out",
    checkOutUntil: "by {time}",
    reference: "Reference",
    gateLabel: "Code to open the park barrier:",
    gateAtReception: "The barrier code will be provided at reception on arrival.",
    closing: `Safe travels and see you soon at ${SITE_NAME}.`,
    questions: "Questions? {from}",
  },
  stayLink: {
    intro:
      "Need to stay longer? You can extend your stay online (subject to pitch availability):",
    cta: "Extend stay",
  },
  extension: {
    subject: `Stay extension — ${SITE_NAME}`,
    title: "Stay extension",
    greeting: "Hello {name},",
    intro: "Your stay on pitch <strong>{pitch}</strong> has been extended.",
    oldDeparture: "Previous departure",
    newDeparture: "New departure",
    amount: "Additional amount",
    payCta: "Pay extension",
    copyLink: "Or copy this link: {url}",
    questions: "Questions? {from}",
  },
  receipt: {
    subject: `Payment receipt — ${SITE_NAME}`,
    title: "Payment confirmed",
    greeting: "Hello {name},",
    amount: "Amount",
    viewReceipt: "View Stripe receipt / invoice",
    receiptLater: "The receipt will be available in your Stripe account.",
    thanks: `Thank you for staying at ${SITE_NAME}.`,
    depositDescription: "50% booking deposit for {zone}{pitch}.",
    balanceDescription: "Remaining 50% balance for {zone}{pitch}.",
    extensionDescription: "Payment for stay extension until {date}.",
  },
};

const fr: EmailCopy = {
  confirmation: {
    subject: `Réservation confirmée — ${SITE_NAME}`,
    title: "Réservation confirmée !",
    greeting: "Bonjour {name},",
    introDeposit: `Votre réservation au <strong>${SITE_NAME}</strong> a été confirmée avec l'acompte de 50 %. Le solde vous sera demandé par e-mail avec un lien Stripe environ 48 h avant l'arrivée.`,
    introFull: `Votre réservation au <strong>${SITE_NAME}</strong> a été confirmée avec le paiement intégral (obligatoire pour une arrivée dans moins de 48 h).`,
    zone: "Zone",
    pitch: "Emplacement réservé",
    checkIn: "Check-in",
    checkInFrom: "à partir de {time}",
    checkOut: "Check-out",
    checkOutUntil: "jusqu'à {time}",
    total: "Total du séjour",
    depositPaid: "Acompte payé (50 %)",
    amountPaid: "Montant payé",
    balanceDue: "Solde (lien Stripe ~48 h avant l'arrivée)",
    reference: "Référence",
    importantTitle: "Important",
    importantBody:
      "l'emplacement et le code barrière ne sont envoyés par e-mail qu'après paiement à <strong>100 %</strong>, en général dans les 24 h avant l'arrivée.",
    questions: "Des questions ? Contactez-nous : {from}",
  },
  balancePayment: {
    subject: `Paiement du solde — ${SITE_NAME}`,
    title: "Finalisez le paiement de votre réservation",
    greeting: "Bonjour {name},",
    intro:
      "Votre arrivée approche. Merci de régler les 50 % restants en ligne pour recevoir le code d'accès à la barrière.",
    zone: "Zone",
    pitch: "Emplacement",
    checkIn: "Check-in",
    total: "Total du séjour",
    paid: "Déjà payé",
    balance: "Montant à payer maintenant",
    payCta: "Payer le solde",
    copyLink: "Ou copiez ce lien : {url}",
    note: "Sans paiement à 100 %, nous n'envoyons pas le code d'entrée.",
    questions: "Des questions ? Contactez-nous : {from}",
  },
  preArrival: {
    subject: `Demain au parc — emplacement et accès · ${SITE_NAME}`,
    title: "Informations d'arrivée",
    greeting: "Bonjour {name},",
    intro: "Votre arrivée est prévue pour demain. Voici les détails définitifs :",
    zone: "Zone",
    pitch: "Emplacement",
    pitchPending: "À attribuer à la réception",
    checkIn: "Check-in",
    checkInFrom: "à partir de {time}",
    checkOut: "Check-out",
    checkOutUntil: "jusqu'à {time}",
    reference: "Référence",
    gateLabel: "Code pour ouvrir la barrière du parc :",
    gateAtReception: "Le code de la barrière sera indiqué à la réception à l'arrivée.",
    closing: `Bon voyage et à bientôt au ${SITE_NAME}.`,
    questions: "Des questions ? {from}",
  },
  stayLink: {
    intro:
      "Besoin de rester plus longtemps ? Vous pouvez prolonger votre séjour en ligne (sous réserve de disponibilité de l'emplacement) :",
    cta: "Prolonger le séjour",
  },
  extension: {
    subject: `Prolongation de séjour — ${SITE_NAME}`,
    title: "Prolongation de séjour",
    greeting: "Bonjour {name},",
    intro: "Votre séjour sur l'emplacement <strong>{pitch}</strong> a été prolongé.",
    oldDeparture: "Départ précédent",
    newDeparture: "Nouveau départ",
    amount: "Montant supplémentaire",
    payCta: "Payer la prolongation",
    copyLink: "Ou copiez ce lien : {url}",
    questions: "Des questions ? {from}",
  },
  receipt: {
    subject: `Reçu de paiement — ${SITE_NAME}`,
    title: "Paiement confirmé",
    greeting: "Bonjour {name},",
    amount: "Montant",
    viewReceipt: "Voir le reçu / facture Stripe",
    receiptLater: "Le reçu sera disponible dans votre compte Stripe.",
    thanks: `Merci pour votre séjour au ${SITE_NAME}.`,
    depositDescription: "Acompte de 50 % de la réservation pour {zone}{pitch}.",
    balanceDescription: "Solde restant (50 %) pour {zone}{pitch}.",
    extensionDescription: "Paiement de la prolongation de séjour jusqu'au {date}.",
  },
};

const de: EmailCopy = {
  confirmation: {
    subject: `Buchung bestätigt — ${SITE_NAME}`,
    title: "Buchung bestätigt!",
    greeting: "Hallo {name},",
    introDeposit: `Ihre Buchung im <strong>${SITE_NAME}</strong> wurde mit der 50 %-Anzahlung bestätigt. Den Restbetrag fordern wir per E-Mail mit Stripe-Link ca. 48 Stunden vor Anreise an.`,
    introFull: `Ihre Buchung im <strong>${SITE_NAME}</strong> wurde mit vollständiger Zahlung bestätigt (erforderlich bei Anreise innerhalb von 48 Stunden).`,
    zone: "Zone",
    pitch: "Reservierter Stellplatz",
    checkIn: "Check-in",
    checkInFrom: "ab {time}",
    checkOut: "Check-out",
    checkOutUntil: "bis {time}",
    total: "Gesamtbetrag des Aufenthalts",
    depositPaid: "Anzahlung bezahlt (50 %)",
    amountPaid: "Bezahlter Betrag",
    balanceDue: "Restbetrag (Stripe-Link ~48 Std. vor Anreise)",
    reference: "Referenz",
    importantTitle: "Wichtig",
    importantBody:
      "Stellplatz und Schrankencode werden erst nach Zahlung von <strong>100 %</strong> per E-Mail gesendet, in der Regel innerhalb von 24 Stunden vor Anreise.",
    questions: "Fragen? Kontaktieren Sie uns: {from}",
  },
  balancePayment: {
    subject: `Restzahlung — ${SITE_NAME}`,
    title: "Bitte Restbetrag bezahlen",
    greeting: "Hallo {name},",
    intro:
      "Ihre Anreise rückt näher. Bitte zahlen Sie die restlichen 50 % online, um den Schrankencode zu erhalten.",
    zone: "Zone",
    pitch: "Stellplatz",
    checkIn: "Check-in",
    total: "Gesamtbetrag",
    paid: "Bereits bezahlt",
    balance: "Jetzt fällig",
    payCta: "Restbetrag zahlen",
    copyLink: "Oder kopieren Sie diesen Link: {url}",
    note: "Ohne 100 %-Zahlung senden wir keinen Einfahrtscode.",
    questions: "Fragen? Kontaktieren Sie uns: {from}",
  },
  preArrival: {
    subject: `Morgen im Park — Stellplatz und Zugang · ${SITE_NAME}`,
    title: "Anreiseinformationen",
    greeting: "Hallo {name},",
    intro: "Ihre Ankunft ist für morgen geplant. Hier sind die endgültigen Angaben:",
    zone: "Zone",
    pitch: "Stellplatz",
    pitchPending: "Wird an der Rezeption zugewiesen",
    checkIn: "Check-in",
    checkInFrom: "ab {time}",
    checkOut: "Check-out",
    checkOutUntil: "bis {time}",
    reference: "Referenz",
    gateLabel: "Code zum Öffnen der Parkschranke:",
    gateAtReception: "Der Schrankencode wird bei Ankunft an der Rezeption mitgeteilt.",
    closing: `Gute Fahrt und bis bald im ${SITE_NAME}.`,
    questions: "Fragen? {from}",
  },
  stayLink: {
    intro:
      "Möchten Sie länger bleiben? Sie können Ihren Aufenthalt online verlängern (je nach Verfügbarkeit des Stellplatzes):",
    cta: "Aufenthalt verlängern",
  },
  extension: {
    subject: `Aufenthaltsverlängerung — ${SITE_NAME}`,
    title: "Aufenthaltsverlängerung",
    greeting: "Hallo {name},",
    intro: "Ihr Aufenthalt auf Stellplatz <strong>{pitch}</strong> wurde verlängert.",
    oldDeparture: "Bisherige Abreise",
    newDeparture: "Neue Abreise",
    amount: "Zusätzlicher Betrag",
    payCta: "Verlängerung bezahlen",
    copyLink: "Oder kopieren Sie diesen Link: {url}",
    questions: "Fragen? {from}",
  },
  receipt: {
    subject: `Zahlungsbeleg — ${SITE_NAME}`,
    title: "Zahlung bestätigt",
    greeting: "Hallo {name},",
    amount: "Betrag",
    viewReceipt: "Stripe-Beleg / Rechnung ansehen",
    receiptLater: "Der Beleg wird in Ihrem Stripe-Konto verfügbar sein.",
    thanks: `Vielen Dank für Ihren Aufenthalt im ${SITE_NAME}.`,
    depositDescription: "50 %-Anzahlung der Buchung für {zone}{pitch}.",
    balanceDescription: "Restbetrag (50 %) für {zone}{pitch}.",
    extensionDescription: "Zahlung der Aufenthaltsverlängerung bis {date}.",
  },
};

const es: EmailCopy = {
  confirmation: {
    subject: `Reserva confirmada — ${SITE_NAME}`,
    title: "¡Reserva confirmada!",
    greeting: "Hola {name},",
    introDeposit: `Su reserva en <strong>${SITE_NAME}</strong> ha sido confirmada con la señal del 50 %. El resto se solicitará por email con enlace Stripe unas 48 horas antes de la llegada.`,
    introFull: `Su reserva en <strong>${SITE_NAME}</strong> ha sido confirmada con el pago íntegro (obligatorio si la llegada es en menos de 48 horas).`,
    zone: "Zona",
    pitch: "Plaza reservada",
    checkIn: "Check-in",
    checkInFrom: "a partir de las {time}",
    checkOut: "Check-out",
    checkOutUntil: "hasta las {time}",
    total: "Total de la estancia",
    depositPaid: "Señal pagada (50 %)",
    amountPaid: "Importe pagado",
    balanceDue: "Resto (enlace Stripe ~48 h antes de la llegada)",
    reference: "Referencia",
    importantTitle: "Importante",
    importantBody:
      "la plaza y el código de barrera solo se envían por email tras el pago al <strong>100 %</strong>, normalmente en las 24 horas antes de la llegada.",
    questions: "¿Preguntas? Contáctenos: {from}",
  },
  balancePayment: {
    subject: `Pago del resto — ${SITE_NAME}`,
    title: "Complete el pago de su reserva",
    greeting: "Hola {name},",
    intro:
      "Su llegada se acerca. Por favor pague el 50 % restante online para recibir el código de la barrera.",
    zone: "Zona",
    pitch: "Plaza",
    checkIn: "Check-in",
    total: "Total de la estancia",
    paid: "Ya pagado",
    balance: "Importe a pagar ahora",
    payCta: "Pagar el resto",
    copyLink: "O copie este enlace: {url}",
    note: "Sin el pago al 100 % no enviamos el código de entrada.",
    questions: "¿Preguntas? Contáctenos: {from}",
  },
  preArrival: {
    subject: `Mañana en el parque — plaza y acceso · ${SITE_NAME}`,
    title: "Información de llegada",
    greeting: "Hola {name},",
    intro: "Su llegada está prevista para mañana. Aquí están los datos definitivos:",
    zone: "Zona",
    pitch: "Plaza",
    pitchPending: "Por asignar en recepción",
    checkIn: "Check-in",
    checkInFrom: "a partir de las {time}",
    checkOut: "Check-out",
    checkOutUntil: "hasta las {time}",
    reference: "Referencia",
    gateLabel: "Código para abrir la barrera del parque:",
    gateAtReception: "El código de la barrera se indicará en recepción a la llegada.",
    closing: `Buen viaje y hasta pronto en ${SITE_NAME}.`,
    questions: "¿Preguntas? {from}",
  },
  stayLink: {
    intro:
      "¿Necesita quedarse más noches? Puede prolongar la estancia online (sujeto a disponibilidad de la plaza):",
    cta: "Prolongar estancia",
  },
  extension: {
    subject: `Extensión de estancia — ${SITE_NAME}`,
    title: "Extensión de estancia",
    greeting: "Hola {name},",
    intro: "Su estancia en la plaza <strong>{pitch}</strong> ha sido prolongada.",
    oldDeparture: "Salida anterior",
    newDeparture: "Nueva salida",
    amount: "Importe adicional",
    payCta: "Pagar extensión",
    copyLink: "O copie este enlace: {url}",
    questions: "¿Preguntas? {from}",
  },
  receipt: {
    subject: `Recibo de pago — ${SITE_NAME}`,
    title: "Pago confirmado",
    greeting: "Hola {name},",
    amount: "Importe",
    viewReceipt: "Ver recibo / factura Stripe",
    receiptLater: "El recibo estará disponible en su cuenta de Stripe.",
    thanks: `Gracias por su estancia en ${SITE_NAME}.`,
    depositDescription: "Señal del 50 % de la reserva en {zone}{pitch}.",
    balanceDescription: "Resto (50 %) de la reserva en {zone}{pitch}.",
    extensionDescription: "Pago de la extensión de estancia hasta {date}.",
  },
};

const copies: Record<Locale, EmailCopy> = { pt, en, fr, de, es };

export function resolveLocale(value?: string | null): Locale {
  if (value && isLocale(value)) return value;
  return "pt";
}

export function getEmailCopy(locale?: string | null): EmailCopy {
  return copies[resolveLocale(locale)];
}

export function fillTemplate(
  template: string,
  params: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}
