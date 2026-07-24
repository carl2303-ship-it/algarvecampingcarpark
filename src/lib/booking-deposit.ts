import { CHECK_IN_TIME } from "@/lib/constants";

/** Hours before check-in under which online booking requires 100% payment. */
export const FULL_PAYMENT_WITHIN_HOURS = 48;

export const ONLINE_BOOKING_DEPOSIT_RATIO = 0.5;

/**
 * Convert a Europe/Lisbon wall-clock date+time to a UTC Date.
 */
export function lisbonDateTimeToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utc));

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? "0");

    let localHour = get("hour");
    if (localHour === 24) localHour = 0;

    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), localHour, get("minute"));
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    utc += desired - asUtc;
  }

  return new Date(utc);
}

export function hoursUntilCheckIn(
  checkIn: string,
  checkInTime: string = CHECK_IN_TIME,
  now: Date = new Date()
): number {
  const checkInAt = lisbonDateTimeToUtc(checkIn, checkInTime);
  return (checkInAt.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function requiresFullPaymentAtBooking(
  checkIn: string,
  checkInTime: string = CHECK_IN_TIME,
  now: Date = new Date()
): boolean {
  return hoursUntilCheckIn(checkIn, checkInTime, now) < FULL_PAYMENT_WITHIN_HOURS;
}

export function bookingChargeCents(
  totalCents: number,
  options: {
    checkIn: string;
    gateEntry?: boolean;
    checkInTime?: string;
    now?: Date;
  }
): number {
  if (totalCents <= 0) return 0;
  if (options.gateEntry) return totalCents;
  if (
    requiresFullPaymentAtBooking(
      options.checkIn,
      options.checkInTime ?? CHECK_IN_TIME,
      options.now
    )
  ) {
    return totalCents;
  }
  return Math.round(totalCents * ONLINE_BOOKING_DEPOSIT_RATIO);
}

export function isReservationFullyPaid(paidCents: number, totalCents: number): boolean {
  return totalCents <= 0 || paidCents >= totalCents;
}
