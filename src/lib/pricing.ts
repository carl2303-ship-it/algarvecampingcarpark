import { differenceInCalendarDays, eachDayOfInterval, format, parseISO } from "date-fns";
import type { ZoneRate } from "@/types/database";

export function calculateNights(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
}

export function getRateForDate(rates: ZoneRate[], date: string): ZoneRate | null {
  const d = parseISO(date);
  return (
    rates.find((r) => {
      const start = parseISO(r.start_date);
      const end = parseISO(r.end_date);
      return d >= start && d <= end;
    }) ?? null
  );
}

export function calculateTotalPrice(
  rates: ZoneRate[],
  checkIn: string,
  checkOut: string
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
  let lastRate: ZoneRate | null = null;

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const rate = getRateForDate(rates, dateStr);
    if (!rate) {
      throw new Error(`Sem tarifa definida para ${dateStr}`);
    }
    totalCents += rate.price_cents_per_night;
    minNights = Math.max(minNights, rate.min_nights);
    lastRate = rate;
  }

  return {
    totalCents,
    nights,
    minNights,
    pricePerNightCents: lastRate?.price_cents_per_night ?? 0,
  };
}

export function formatPrice(cents: number, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
