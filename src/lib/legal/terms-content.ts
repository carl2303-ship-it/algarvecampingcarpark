import {
  DEFAULT_PARK_SETTINGS,
  formatTimeForLocale,
  type Locale,
  type ParkSettings,
} from "@/lib/constants";

export type TermsSection = {
  title: string;
  paragraphs?: string[];
  list?: { label: string; text: string }[];
  bullets?: string[];
  closingParagraphs?: string[];
};

export type TermsContent = {
  eyebrow: string;
  title: string;
  sections: TermsSection[];
  lastUpdatedLabel: string;
  lastUpdated: string;
};

const termsPt: TermsContent = {
  eyebrow: "Reservas",
  title: "Termos de Reserva e Política de Pagamentos",
  sections: [
    {
      title: "1. Sistema de Pagamento Online (Stripe)",
      list: [
        {
          label: "Pagamento Seguro",
          text: "Todos os pagamentos no nosso website são processados de forma encriptada através da plataforma Stripe, garantindo a máxima segurança dos seus dados bancários.",
        },
        {
          label: "Métodos Aceites",
          text: "Aceitamos cartões de crédito e débito (Visa, Mastercard), carteiras digitais (Apple Pay, Google Pay) e MB WAY para clientes portugueses.",
        },
        {
          label: "Garantia de Reserva",
          text: "Uma reserva só é considerada confirmada e garantida após o processamento com sucesso do pagamento respectivo no nosso sistema.",
        },
      ],
    },
    {
      title: "2. Modelos de Reserva",
      paragraphs: [
        "Pagamento de um sinal de 50% online para garantir a vaga, sendo o restante valor pago no dia da chegada (em dinheiro ou MB WAY).",
      ],
    },
    {
      title: "3. Política de Cancelamento e Reembolsos",
      list: [
        {
          label: "Cancelamento Gratuito (Reembolso Total)",
          text: "Se o cliente cancelar com mais de 7 dias de antecedência face à data de check-in, terá direito ao reembolso de 100% do valor pago.",
        },
        {
          label: "Cancelamento Parcial",
          text: "Se o cancelamento for feito entre 48 horas e 7 dias de antecedência, será retido um valor correspondente a 50% do sinal pago, sendo o restante devolvido.",
        },
        {
          label: 'Cancelamento de Última Hora ou "No-Show"',
          text: "Cancelamentos com menos de 48 horas de antecedência ou o não comparecimento no dia estipulado não conferem direito a qualquer reembolso.",
        },
        {
          label: "Taxas do organismo de pagamento",
          text: "Em caso de reembolso, serão deduzidas as taxas cobradas pelo organismo de pagamento (Stripe) sobre a transação, não sendo estas reembolsáveis pelo parque.",
        },
      ],
    },
    {
      title: "4. Alterações de Datas",
      paragraphs: [
        "Os hóspedes podem solicitar a alteração das datas da sua reserva sem qualquer custo, desde que o façam com um aviso prévio de pelo menos 3 dias e mediante a disponibilidade de lugares no parque para as novas datas pretendidas.",
        "Se as novas datas corresponderem a uma época com tarifário diferente (ex: passagem de época baixa para época alta), o cliente terá de pagar a respectiva diferença de valor.",
      ],
    },
    {
      title: "5. Exactidão dos Dados do Cliente",
      paragraphs: [
        "O cliente é responsável pela exactidão e veracidade de todos os dados fornecidos aquando da reserva (nome, contactos, matrícula do veículo, número de hóspedes, datas, etc.).",
        "A exactidão das informações será verificada pelos responsáveis do parque aquando do check-in. Dados incorrectos ou incompletos podem impedir o acesso ao parque ou implicar ajustes ao valor da estadia.",
      ],
    },
  ],
  lastUpdatedLabel: "Última atualização",
  lastUpdated: "Julho de 2026",
};

const termsEn: TermsContent = {
  eyebrow: "Bookings",
  title: "Booking Terms and Payment Policy",
  sections: [
    {
      title: "1. Online Payment System (Stripe)",
      list: [
        {
          label: "Secure Payment",
          text: "All payments on our website are processed in encrypted form through the Stripe platform, ensuring maximum security of your banking data.",
        },
        {
          label: "Accepted Methods",
          text: "We accept credit and debit cards (Visa, Mastercard), digital wallets (Apple Pay, Google Pay) and MB WAY for Portuguese customers.",
        },
        {
          label: "Booking Guarantee",
          text: "A booking is only considered confirmed and guaranteed after successful processing of the respective payment in our system.",
        },
      ],
    },
    {
      title: "2. Booking Models",
      paragraphs: [
        "Payment of a 50% deposit online to secure your pitch, with the remaining balance paid on arrival day (in cash or via MB WAY).",
      ],
    },
    {
      title: "3. Cancellation and Refund Policy",
      list: [
        {
          label: "Free Cancellation (Full Refund)",
          text: "If the customer cancels more than 7 days before the check-in date, they are entitled to a 100% refund of the amount paid.",
        },
        {
          label: "Partial Cancellation",
          text: "If cancellation is made between 48 hours and 7 days in advance, an amount corresponding to 50% of the deposit paid will be retained, with the remainder refunded.",
        },
        {
          label: 'Last-Minute Cancellation or "No-Show"',
          text: "Cancellations less than 48 hours in advance or failure to arrive on the scheduled date do not entitle the customer to any refund.",
        },
        {
          label: "Payment processor fees",
          text: "In the event of a refund, fees charged by the payment processor (Stripe) on the transaction will be deducted and are not refundable by the park.",
        },
      ],
    },
    {
      title: "4. Date Changes",
      paragraphs: [
        "Guests may request a change to their booking dates at no extra cost, provided they give at least 3 days' notice and subject to pitch availability for the new dates requested.",
        "If the new dates fall in a season with a different rate (e.g. moving from low to high season), the customer must pay the corresponding price difference.",
      ],
    },
    {
      title: "5. Accuracy of Customer Information",
      paragraphs: [
        "The customer is responsible for the accuracy and truthfulness of all information provided when booking (name, contact details, vehicle registration, number of guests, dates, etc.).",
        "The accuracy of this information will be verified by the park managers at check-in. Incorrect or incomplete data may prevent access to the park or require adjustments to the stay charges.",
      ],
    },
  ],
  lastUpdatedLabel: "Last updated",
  lastUpdated: "July 2026",
};

const termsFr: TermsContent = {
  eyebrow: "Réservations",
  title: "Conditions de réservation et politique de paiement",
  sections: [
    {
      title: "1. Système de paiement en ligne (Stripe)",
      list: [
        {
          label: "Paiement sécurisé",
          text: "Tous les paiements sur notre site sont traités de manière chiffrée via la plateforme Stripe, garantissant une sécurité maximale de vos données bancaires.",
        },
        {
          label: "Moyens acceptés",
          text: "Nous acceptons les cartes de crédit et de débit (Visa, Mastercard), les portefeuilles numériques (Apple Pay, Google Pay) et MB WAY pour les clients portugais.",
        },
        {
          label: "Garantie de réservation",
          text: "Une réservation n'est considérée comme confirmée et garantie qu'après le traitement réussi du paiement correspondant dans notre système.",
        },
      ],
    },
    {
      title: "2. Modèles de réservation",
      paragraphs: [
        "Paiement d'un acompte de 50 % en ligne pour garantir l'emplacement, le solde étant payé le jour de l'arrivée (en espèces ou via MB WAY).",
      ],
    },
    {
      title: "3. Politique d'annulation et de remboursement",
      list: [
        {
          label: "Annulation gratuite (remboursement intégral)",
          text: "Si le client annule plus de 7 jours avant la date de check-in, il a droit au remboursement de 100 % du montant payé.",
        },
        {
          label: "Annulation partielle",
          text: "Si l'annulation est effectuée entre 48 heures et 7 jours à l'avance, un montant correspondant à 50 % de l'acompte payé sera retenu, le reste étant remboursé.",
        },
        {
          label: 'Annulation de dernière minute ou "no-show"',
          text: "Les annulations à moins de 48 heures ou le non-présentation à la date prévue ne donnent droit à aucun remboursement.",
        },
        {
          label: "Frais du prestataire de paiement",
          text: "En cas de remboursement, les frais facturés par le prestataire de paiement (Stripe) sur la transaction seront déduits et ne sont pas remboursables par le parc.",
        },
      ],
    },
    {
      title: "4. Modification des dates",
      paragraphs: [
        "Les clients peuvent demander une modification des dates de leur réservation sans frais, à condition de prévenir au moins 3 jours à l'avance et sous réserve de disponibilité des emplacements pour les nouvelles dates souhaitées.",
        "Si les nouvelles dates correspondent à une saison avec un tarif différent (ex. : passage de basse à haute saison), le client devra payer la différence de prix correspondante.",
      ],
    },
    {
      title: "5. Exactitude des données du client",
      paragraphs: [
        "Le client est responsable de l'exactitude et de la véracité de toutes les informations fournies lors de la réservation (nom, contacts, immatriculation du véhicule, nombre de personnes, dates, etc.).",
        "L'exactitude de ces informations sera vérifiée par les responsables du parc lors du check-in. Des données incorrectes ou incomplètes peuvent empêcher l'accès au parc ou entraîner des ajustements du montant du séjour.",
      ],
    },
  ],
  lastUpdatedLabel: "Dernière mise à jour",
  lastUpdated: "Juillet 2026",
};

const termsDe: TermsContent = {
  eyebrow: "Buchungen",
  title: "Buchungsbedingungen und Zahlungsrichtlinie",
  sections: [
    {
      title: "1. Online-Zahlungssystem (Stripe)",
      list: [
        {
          label: "Sichere Zahlung",
          text: "Alle Zahlungen auf unserer Website werden verschlüsselt über die Plattform Stripe abgewickelt und gewährleisten maximale Sicherheit Ihrer Bankdaten.",
        },
        {
          label: "Akzeptierte Zahlungsmittel",
          text: "Wir akzeptieren Kredit- und Debitkarten (Visa, Mastercard), digitale Wallets (Apple Pay, Google Pay) sowie MB WAY für portugiesische Kunden.",
        },
        {
          label: "Buchungsgarantie",
          text: "Eine Buchung gilt erst nach erfolgreicher Verarbeitung der jeweiligen Zahlung in unserem System als bestätigt und garantiert.",
        },
      ],
    },
    {
      title: "2. Buchungsmodelle",
      paragraphs: [
        "Zahlung einer 50 %-Anzahlung online zur Sicherung des Stellplatzes; der Restbetrag wird am Anreisetag bar oder per MB WAY bezahlt.",
      ],
    },
    {
      title: "3. Stornierungs- und Rückerstattungsrichtlinie",
      list: [
        {
          label: "Kostenlose Stornierung (volle Rückerstattung)",
          text: "Storniert der Gast mehr als 7 Tage vor dem Check-in-Datum, hat er Anspruch auf eine 100 %-Rückerstattung des gezahlten Betrags.",
        },
        {
          label: "Teilweise Stornierung",
          text: "Bei einer Stornierung zwischen 48 Stunden und 7 Tagen im Voraus wird ein Betrag in Höhe von 50 % der gezahlten Anzahlung einbehalten; der Rest wird erstattet.",
        },
        {
          label: 'Kurzfristige Stornierung oder "No-Show"',
          text: "Stornierungen weniger als 48 Stunden im Voraus oder Nichterscheinen am vereinbarten Tag begründen keinen Anspruch auf Rückerstattung.",
        },
        {
          label: "Gebühren des Zahlungsdienstleisters",
          text: "Im Falle einer Rückerstattung werden die vom Zahlungsdienstleister (Stripe) erhobenen Transaktionsgebühren abgezogen und sind vom Park nicht erstattungsfähig.",
        },
      ],
    },
    {
      title: "4. Datumsänderungen",
      paragraphs: [
        "Gäste können eine Änderung der Buchungsdaten kostenlos beantragen, sofern sie mindestens 3 Tage im Voraus Bescheid geben und Stellplätze für die gewünschten neuen Daten verfügbar sind.",
        "Fallen die neuen Daten in eine Saison mit anderem Tarif (z. B. Wechsel von Nebensaison zu Hochsaison), muss der Gast die entsprechende Preisdifferenz zahlen.",
      ],
    },
    {
      title: "5. Richtigkeit der Kundendaten",
      paragraphs: [
        "Der Gast ist für die Richtigkeit und Wahrhaftigkeit aller bei der Buchung angegebenen Daten verantwortlich (Name, Kontaktdaten, Fahrzeugkennzeichen, Gästezahl, Daten usw.).",
        "Die Richtigkeit dieser Angaben wird bei der Anreise von den Parkverantwortlichen überprüft. Falsche oder unvollständige Daten können den Zugang zum Park verhindern oder Anpassungen der Aufenthaltskosten erfordern.",
      ],
    },
  ],
  lastUpdatedLabel: "Zuletzt aktualisiert",
  lastUpdated: "Juli 2026",
};

const termsEs: TermsContent = {
  eyebrow: "Reservas",
  title: "Términos de reserva y política de pagos",
  sections: [
    {
      title: "1. Sistema de pago online (Stripe)",
      list: [
        {
          label: "Pago seguro",
          text: "Todos los pagos en nuestro sitio web se procesan de forma cifrada a través de la plataforma Stripe, garantizando la máxima seguridad de sus datos bancarios.",
        },
        {
          label: "Métodos aceptados",
          text: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard), monederos digitales (Apple Pay, Google Pay) y MB WAY para clientes portugueses.",
        },
        {
          label: "Garantía de reserva",
          text: "Una reserva solo se considera confirmada y garantizada tras el procesamiento correcto del pago correspondiente en nuestro sistema.",
        },
      ],
    },
    {
      title: "2. Modelos de reserva",
      paragraphs: [
        "Pago de una señal del 50 % online para garantizar la plaza; el resto se paga el día de llegada (en efectivo o mediante MB WAY).",
      ],
    },
    {
      title: "3. Política de cancelación y reembolsos",
      list: [
        {
          label: "Cancelación gratuita (reembolso total)",
          text: "Si el cliente cancela con más de 7 días de antelación respecto a la fecha de check-in, tendrá derecho al reembolso del 100 % del importe pagado.",
        },
        {
          label: "Cancelación parcial",
          text: "Si la cancelación se realiza entre 48 horas y 7 días de antelación, se retendrá un importe correspondiente al 50 % de la señal pagada y se devolverá el resto.",
        },
        {
          label: 'Cancelación de última hora o "no-show"',
          text: "Las cancelaciones con menos de 48 horas de antelación o la no presentación en el día estipulado no dan derecho a ningún reembolso.",
        },
        {
          label: "Comisiones del procesador de pagos",
          text: "En caso de reembolso, se deducirán las comisiones cobradas por el procesador de pagos (Stripe) sobre la transacción, que no son reembolsables por el parque.",
        },
      ],
    },
    {
      title: "4. Cambios de fechas",
      paragraphs: [
        "Los huéspedes pueden solicitar el cambio de fechas de su reserva sin coste, siempre que lo hagan con al menos 3 días de antelación y sujeto a la disponibilidad de plazas para las nuevas fechas solicitadas.",
        "Si las nuevas fechas corresponden a una temporada con tarifa distinta (p. ej., paso de temporada baja a alta), el cliente deberá pagar la diferencia de precio correspondiente.",
      ],
    },
    {
      title: "5. Exactitud de los datos del cliente",
      paragraphs: [
        "El cliente es responsable de la exactitud y veracidad de todos los datos facilitados al reservar (nombre, contactos, matrícula del vehículo, número de huéspedes, fechas, etc.).",
        "La exactitud de esta información será verificada por los responsables del parque en el check-in. Datos incorrectos o incompletos pueden impedir el acceso al parque o implicar ajustes en el importe de la estancia.",
      ],
    },
  ],
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "Julio de 2026",
};

const termsByLocale: Record<Locale, TermsContent> = {
  pt: termsPt,
  en: termsEn,
  fr: termsFr,
  de: termsDe,
  es: termsEs,
};

function buildHoursSection(locale: Locale, settings: ParkSettings): TermsSection {
  const checkIn = formatTimeForLocale(settings.check_in_time, locale);
  const checkOut = formatTimeForLocale(settings.check_out_time, locale);

  switch (locale) {
    case "en":
      return {
        title: "6. Check-in, Check-out and Stay Extension",
        list: [
          { label: "Check-in Time", text: `From ${checkIn}.` },
          {
            label: "Check-out Time",
            text: `The pitch must be vacated by ${checkOut} on the departure day. (Other times available upon request.)`,
          },
          {
            label: "Extension",
            text: "If the customer wishes to stay longer than originally booked, the extension is strictly subject to pitch availability at the time and must be paid at the park reception or through a new payment link generated in our app.",
          },
        ],
      };
    case "fr":
      return {
        title: "6. Check-in, check-out et prolongation du séjour",
        list: [
          { label: "Heure de check-in", text: `À partir de ${checkIn}.` },
          {
            label: "Heure de check-out",
            text: `L'emplacement doit être libéré avant ${checkOut} le jour du départ. (Autres horaires sur demande.)`,
          },
          {
            label: "Prolongation",
            text: "Si le client souhaite rester plus longtemps que prévu, la prolongation est strictement soumise à la disponibilité de l'emplacement au moment voulu et doit être payée à la réception du parc ou via un nouveau lien de paiement généré dans notre application.",
          },
        ],
      };
    case "de":
      return {
        title: "6. Check-in, Check-out und Aufenthaltsverlängerung",
        list: [
          { label: "Check-in-Zeit", text: `Ab ${checkIn}.` },
          {
            label: "Check-out-Zeit",
            text: `Der Stellplatz muss am Abreisetag bis ${checkOut} geräumt sein. (Andere Zeiten auf Anfrage möglich.)`,
          },
          {
            label: "Verlängerung",
            text: "Möchte der Gast länger bleiben als ursprünglich gebucht, hängt die Verlängerung strikt von der Verfügbarkeit des Stellplatzes ab und muss an der Parkrezeption oder über einen neuen, in unserer App erzeugten Zahlungslink bezahlt werden.",
          },
        ],
      };
    case "es":
      return {
        title: "6. Check-in, check-out y prolongación de la estancia",
        list: [
          { label: "Horario de check-in", text: `A partir de las ${checkIn}.` },
          {
            label: "Horario de check-out",
            text: `La plaza debe quedar libre antes de las ${checkOut} el día de salida. (Otros horarios bajo petición.)`,
          },
          {
            label: "Prolongación",
            text: "Si el cliente desea quedarse más días de los contratados en la reserva original, la extensión estará estrictamente sujeta a la disponibilidad de plazas en ese momento y deberá pagarse en recepción del parque o mediante un nuevo enlace de pago generado en nuestra app.",
          },
        ],
      };
    default:
      return {
        title: "6. Check-in, Check-out e Prolongamento da Estadia",
        list: [
          {
            label: "Horário de Check-in",
            text: `A partir das ${checkIn}.`,
          },
          {
            label: "Horário de Check-out",
            text: `O lugar deve ser libertado até às ${checkOut} do dia de saída. (Outro horário, sob pedido.)`,
          },
          {
            label: "Prolongamento",
            text: "Se o cliente desejar ficar mais dias do que o contratado na reserva original, a extensão estará estritamente sujeita à disponibilidade de vagas no momento e deverá ser paga no balcão do parque ou através de um novo link gerado na nossa app.",
          },
        ],
      };
  }
}

export function getTermsContent(
  locale: Locale,
  settings: ParkSettings = DEFAULT_PARK_SETTINGS
): TermsContent {
  const base = termsByLocale[locale] ?? termsPt;
  return {
    ...base,
    sections: [...base.sections, buildHoursSection(locale, settings)],
  };
}
