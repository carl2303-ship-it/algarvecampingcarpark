import { differenceInCalendarDays, eachDayOfInterval, format, parseISO } from "date-fns";
import type { ZoneRate } from "@/types/database";
import {
  computeSupplementsCentsPerNight,
  getExtraGuestSupplement,
  type PricingContext,
  type PricingSupplement,
} from "@/lib/pricing-supplements";

export const EXTRA_GUEST_CENTS_PER_NIGHT = 150;
export const LONG_MOTORHOME_CENTS_PER_NIGHT = 200;
export const ELECTRICITY_10A_SURCHARGE_CENTS_PER_NIGHT = 50;

export type ElectricityAmperage = 6 | 10;

/** @deprecated Prefer PricingContext + PricingSupplement[] */
export type PricingOptions = {
  motorhomeOver9m?: boolean;
  electricityAmperage?: ElectricityAmperage | null;
  extraGuestCentsPerNight?: number;
  longMotorhomeCentsPerNight?: number;
  electricity10aSurchargeCentsPerNight?: number;
  manualSupplementIds?: string[];
  supplements?: PricingSupplement[];
};

export function getElectricitySurchargeCentsPerNight(
  amperage?: ElectricityAmperage | null,
  surcharge10aCentsPerNight = ELECTRICITY_10A_SURCHARGE_CENTS_PER_NIGHT
): number {
  return amperage === 10 ? surcharge10aCentsPerNight : 0;
}

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

export function getNightlyPriceCents(
  rate: ZoneRate,
  numGuests: number,
  extraGuestCentsPerNight = EXTRA_GUEST_CENTS_PER_NIGHT,
  guestThreshold = 4
): number {
  const base2 = rate.price_cents_per_night;
  const base34 = rate.price_cents_3_4_guests ?? base2 + 200;

  if (numGuests <= 2) return base2;
  if (numGuests <= guestThreshold) return base34;
  return base34 + (numGuests - guestThreshold) * extraGuestCentsPerNight;
}

function resolvePricingContext(
  numGuests: number,
  options?: PricingOptions
): { context: PricingContext; supplements: PricingSupplement[]; extraGuestCents: number; guestThreshold: number } {
  const supplements = options?.supplements ?? [];
  const extraGuestSupplement = getExtraGuestSupplement(supplements);
  const guestThreshold = Number(extraGuestSupplement?.trigger_config?.guest_threshold ?? 4);
  const extraGuestCents =
    extraGuestSupplement?.amount_cents_per_night ??
    options?.extraGuestCentsPerNight ??
    EXTRA_GUEST_CENTS_PER_NIGHT;

  return {
    context: {
      numGuests,
      motorhomeOver9m: options?.motorhomeOver9m,
      electricityAmperage: options?.electricityAmperage,
      manualSupplementIds: options?.manualSupplementIds,
    },
    supplements,
    extraGuestCents,
    guestThreshold,
  };
}

function nightlySupplementsFromLegacy(options?: PricingOptions): number {
  const motorhomeSurcharge = options?.motorhomeOver9m
    ? (options.longMotorhomeCentsPerNight ?? LONG_MOTORHOME_CENTS_PER_NIGHT)
    : 0;
  const electricitySurcharge = getElectricitySurchargeCentsPerNight(
    options?.electricityAmperage,
    options?.electricity10aSurchargeCentsPerNight ?? ELECTRICITY_10A_SURCHARGE_CENTS_PER_NIGHT
  );
  return motorhomeSurcharge + electricitySurcharge;
}

export function calculateTotalPrice(
  rates: ZoneRate[],
  checkIn: string,
  checkOut: string,
  numGuests = 2,
  options?: PricingOptions
): { totalCents: number; nights: number; minNights: number; pricePerNightCents: number } {
  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) {
    return { totalCents: 0, nights: 0, minNights: 1, pricePerNightCents: 0 };
  }

  const days = eachDayOfInterval({
    start: parseISO(checkIn),
    end: parseISO(checkOut),
  }).slice(0, -1);

  const { context, supplements, extraGuestCents, guestThreshold } = resolvePricingContext(
    numGuests,
    options
  );
  const supplementsPerNight = supplements.length
    ? computeSupplementsCentsPerNight(supplements, context)
    : nightlySupplementsFromLegacy(options);

  let totalCents = 0;
  let minNights = 1;
  let lastNightCents = 0;

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const rate = getRateForDate(rates, dateStr);
    if (!rate) {
      throw new Error(`Sem tarifa definida para ${dateStr}`);
    }
    const nightCents =
      getNightlyPriceCents(rate, numGuests, extraGuestCents, guestThreshold) +
      supplementsPerNight;
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
