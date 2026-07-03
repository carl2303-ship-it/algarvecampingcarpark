import type { Locale } from "@/lib/constants";

export interface PricingOccupancyRow {
  labelPt: string;
  labelEn: string;
  twoPeople: number;
  threeFourPeople: number;
}

export interface PricingCategory {
  id: "electric" | "no-electric";
  labelPt: string;
  labelEn: string;
  emoji: string;
  rows: PricingOccupancyRow[];
}

export interface PricingSeasonBlock {
  id: "august" | "summer" | "low";
  titlePt: string;
  titleEn: string;
  periodPt: string;
  periodEn: string;
  emoji: string;
  gradient: string;
  categories: PricingCategory[];
}

export interface PricingExtra {
  namePt: string;
  nameEn: string;
  price: number;
  unitPt: string;
  unitEn: string;
  emoji: string;
}

export const PREMIUM_SURCHARGE_EUR = 1;

export const PRICING_SEASONS: PricingSeasonBlock[] = [
  {
    id: "august",
    titlePt: "Agosto",
    titleEn: "August",
    periodPt: "01/08 — 31/08",
    periodEn: "01 Aug — 31 Aug",
    emoji: "🌞",
    gradient: "from-orange-400 via-amber-500 to-yellow-500",
    categories: [
      {
        id: "electric",
        labelPt: "Com eletricidade",
        labelEn: "With electricity",
        emoji: "⚡",
        rows: [{ labelPt: "Por noite", labelEn: "Per night", twoPeople: 14.5, threeFourPeople: 16.5 }],
      },
      {
        id: "no-electric",
        labelPt: "Sem eletricidade",
        labelEn: "Without electricity",
        emoji: "🏕️",
        rows: [{ labelPt: "Por noite", labelEn: "Per night", twoPeople: 11, threeFourPeople: 13 }],
      },
    ],
  },
  {
    id: "summer",
    titlePt: "Verão",
    titleEn: "Summer",
    periodPt: "15/06 — 31/07 e 01/09 — 15/09",
    periodEn: "15 Jun — 31 Jul and 01 Sep — 15 Sep",
    emoji: "☀️",
    gradient: "from-amber-400 via-orange-400 to-rose-400",
    categories: [
      {
        id: "electric",
        labelPt: "Com eletricidade",
        labelEn: "With electricity",
        emoji: "⚡",
        rows: [{ labelPt: "Por noite", labelEn: "Per night", twoPeople: 13.5, threeFourPeople: 15.5 }],
      },
      {
        id: "no-electric",
        labelPt: "Sem eletricidade",
        labelEn: "Without electricity",
        emoji: "🏕️",
        rows: [{ labelPt: "Por noite", labelEn: "Per night", twoPeople: 10, threeFourPeople: 12 }],
      },
    ],
  },
  {
    id: "low",
    titlePt: "Época baixa",
    titleEn: "Low season",
    periodPt: "15/09 — 15/06",
    periodEn: "15 Sep — 15 Jun",
    emoji: "🌿",
    gradient: "from-sky-500 via-blue-500 to-indigo-600",
    categories: [
      {
        id: "electric",
        labelPt: "Com eletricidade",
        labelEn: "With electricity",
        emoji: "⚡",
        rows: [{ labelPt: "Por noite", labelEn: "Per night", twoPeople: 12.5, threeFourPeople: 14.5 }],
      },
      {
        id: "no-electric",
        labelPt: "Sem eletricidade",
        labelEn: "Without electricity",
        emoji: "🏕️",
        rows: [{ labelPt: "Por noite", labelEn: "Per night", twoPeople: 9, threeFourPeople: 11 }],
      },
    ],
  },
];

export const PRICING_EXTRAS: PricingExtra[] = [
  {
    namePt: "Serviço Autocaravana",
    nameEn: "Motorhome service",
    price: 6,
    unitPt: "",
    unitEn: "",
    emoji: "🚐",
  },
  {
    namePt: "Duche",
    nameEn: "Shower",
    price: 1,
    unitPt: "/ 5 min",
    unitEn: "/ 5 min",
    emoji: "🚿",
  },
  {
    namePt: "Máquina de lavar",
    nameEn: "Washing machine",
    price: 4,
    unitPt: "",
    unitEn: "",
    emoji: "🧺",
  },
  {
    namePt: "Secador",
    nameEn: "Tumble dryer",
    price: 3,
    unitPt: "",
    unitEn: "",
    emoji: "🌀",
  },
];

export function formatEuroAmount(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function premiumPrice(base: number): number {
  return base + PREMIUM_SURCHARGE_EUR;
}
