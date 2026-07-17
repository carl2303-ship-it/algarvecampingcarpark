import type { Locale } from "@/lib/constants";
import { bcp47Locale } from "@/lib/locale-format";

export type PricingSeasonId = "august" | "summer" | "low";
export type PricingCategoryId = "electric" | "no-electric";
export type PricingExtraId =
  | "motorhome_service"
  | "shower"
  | "washing_machine"
  | "dryer";

export interface PricingOccupancyRow {
  twoPeople: number;
  threeFourPeople: number;
}

export interface PricingCategory {
  id: PricingCategoryId;
  emoji: string;
  rows: PricingOccupancyRow[];
}

export interface PricingSeasonBlock {
  id: PricingSeasonId;
  emoji: string;
  gradient: string;
  categories: PricingCategory[];
}

export interface PricingExtra {
  id: PricingExtraId;
  price: number;
  /** i18n key under prices.extras_units, or null if no unit suffix */
  unitKey: "per_5_min" | null;
  emoji: string;
}

export const PRICING_SEASONS: PricingSeasonBlock[] = [
  {
    id: "august",
    emoji: "🌞",
    gradient: "from-orange-400 via-amber-500 to-yellow-500",
    categories: [
      {
        id: "electric",
        emoji: "⚡",
        rows: [{ twoPeople: 14.5, threeFourPeople: 16.5 }],
      },
      {
        id: "no-electric",
        emoji: "🏕️",
        rows: [{ twoPeople: 11, threeFourPeople: 13 }],
      },
    ],
  },
  {
    id: "summer",
    emoji: "☀️",
    gradient: "from-amber-400 via-orange-400 to-rose-400",
    categories: [
      {
        id: "electric",
        emoji: "⚡",
        rows: [{ twoPeople: 13.5, threeFourPeople: 15.5 }],
      },
      {
        id: "no-electric",
        emoji: "🏕️",
        rows: [{ twoPeople: 10, threeFourPeople: 12 }],
      },
    ],
  },
  {
    id: "low",
    emoji: "🌿",
    gradient: "from-sky-500 via-blue-500 to-indigo-600",
    categories: [
      {
        id: "electric",
        emoji: "⚡",
        rows: [{ twoPeople: 12.5, threeFourPeople: 14.5 }],
      },
      {
        id: "no-electric",
        emoji: "🏕️",
        rows: [{ twoPeople: 9, threeFourPeople: 11 }],
      },
    ],
  },
];

export const PRICING_EXTRAS: PricingExtra[] = [
  { id: "motorhome_service", price: 6, unitKey: null, emoji: "🚐" },
  { id: "shower", price: 1, unitKey: "per_5_min", emoji: "🚿" },
  { id: "washing_machine", price: 4, unitKey: null, emoji: "🧺" },
  { id: "dryer", price: 3, unitKey: null, emoji: "🌀" },
];

export function formatEuroAmount(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(bcp47Locale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
