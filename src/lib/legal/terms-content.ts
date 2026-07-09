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
      ],
    },
    {
      title: "4. Alterações de Datas",
      paragraphs: [
        "Os hóspedes podem solicitar a alteração das datas da sua reserva sem qualquer custo, desde que o façam com um aviso prévio de pelo menos 3 dias e mediante a disponibilidade de lugares no parque para as novas datas pretendidas.",
        "Se as novas datas corresponderem a uma época com tarifário diferente (ex: passagem de época baixa para época alta), o cliente terá de pagar a respectiva diferença de valor.",
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
      ],
    },
    {
      title: "4. Date Changes",
      paragraphs: [
        "Guests may request a change to their booking dates at no extra cost, provided they give at least 3 days' notice and subject to pitch availability for the new dates requested.",
        "If the new dates fall in a season with a different rate (e.g. moving from low to high season), the customer must pay the corresponding price difference.",
      ],
    },
  ],
  lastUpdatedLabel: "Last updated",
  lastUpdated: "July 2026",
};

function buildHoursSection(locale: Locale, settings: ParkSettings): TermsSection {
  if (locale === "en") {
    return {
      title: "5. Check-in, Check-out and Stay Extension",
      list: [
        {
          label: "Check-in Time",
          text: `From ${settings.check_in_time}.`,
        },
        {
          label: "Check-out Time",
          text: `The pitch must be vacated by ${settings.check_out_time} on the departure day. (Other times available upon request.)`,
        },
        {
          label: "Extension",
          text: "If the customer wishes to stay longer than originally booked, the extension is strictly subject to pitch availability at the time and must be paid at the park reception or through a new payment link generated in our app.",
        },
      ],
    };
  }

  return {
    title: "5. Check-in, Check-out e Prolongamento da Estadia",
    list: [
      {
        label: "Horário de Check-in",
        text: `A partir das ${formatTimeForLocale(settings.check_in_time)}.`,
      },
      {
        label: "Horário de Check-out",
        text: `O lugar deve ser libertado até às ${formatTimeForLocale(settings.check_out_time)} do dia de saída. (Outro horário, sob pedido.)`,
      },
      {
        label: "Prolongamento",
        text: "Se o cliente desejar ficar mais dias do que o contratado na reserva original, a extensão estará estritamente sujeita à disponibilidade de vagas no momento e deverá ser paga no balcão do parque ou através de um novo link gerado na nossa app.",
      },
    ],
  };
}

export function getTermsContent(
  locale: Locale,
  settings: ParkSettings = DEFAULT_PARK_SETTINGS
): TermsContent {
  const base = locale === "en" ? termsEn : termsPt;
  return {
    ...base,
    sections: [...base.sections, buildHoursSection(locale, settings)],
  };
}
