import { differenceInCalendarDays, eachDayOfInterval, format, parseISO } from "date-fns";
import type { ZoneRate } from "@/types/database";

export const EXTRA_GUEST_CENTS_PER_NIGHT = 150;
export const LONG_MOTORHOME_CENTS_PER_NIGHT = 200;

export function calculateNights(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
}

export function getRateForDate(rates: ZoneRate[], date: string): ZoneRate | null {
  const d = parseISO(date);
  const matches = rates.filter((r) => {
    const start = parseISO(r.start_date);
    const end = parseISO(r.end_date);
    return d >= start && d <= end;
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const priority: Record<string, number> = { august: 3, summer: 2, low: 1, winter: 0 };
  return matches.sort(
    (a, b) => (priority[b.season] ?? 0) - (priority[a.season] ?? 0)
  )[0];
}

export function getNightlyPriceCents(rate: ZoneRate, numGuests: number): number {
  const base2 = rate.price_cents_per_night;
  const base34 = rate.price_cents_3_4_guests ?? base2 + 200;

  if (numGuests <= 2) return base2;
  if (numGuests <= 4) return base34;
  return base34 + (numGuests - 4) * EXTRA_GUEST_CENTS_PER_NIGHT;
}

export function calculateTotalPrice(
  rates: ZoneRate[],
  checkIn: string,
  checkOut: string,
  numGuests = 2,
  options?: { motorhomeOver9m?: boolean }
): { totalCents: number; nights: number; minNights: number; pricePerNightCents: number } {
  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) {
    return { totalCents: 0, nights: 0, minNights: 1, pricePerNightCents: 0 };
  }

  const days = eachDayOfInterval({
    start: parseISO(checkIn),
    end: parseISO(checkOut),
  }).slice(0, -1);

  let totalCents = 0;
  let minNights = 1;
  let lastNightCents = 0;
  const motorhomeSurcharge = options?.motorhomeOver9m ? LONG_MOTORHOME_CENTS_PER_NIGHT : 0;

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const rate = getRateForDate(rates, dateStr);
    if (!rate) {
      throw new Error(`Sem tarifa definida para ${dateStr}`);
    }
    const nightCents = getNightlyPriceCents(rate, numGuests) + motorhomeSurcharge;
    totalCents += nightCents;
    minNights = Math.max(minNights, rate.min_nights);
    lastNightCents = nightCents;
  }

  return {
    totalCents,
    nights,
    minNights,
    pricePerNightCents: lastNightCents,
  };
}

export function formatPrice(cents: number, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
