import { CHECK_IN_TIME } from "@/lib/constants";

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

/** Online bookings always require 100% at checkout. */
export function requiresFullPaymentAtBooking(
  _checkIn?: string,
  _checkInTime?: string,
  _now?: Date
): boolean {
  return true;
}

/**
 * Amount charged at booking time — always the full stay total.
 * (Legacy partial bookings may still settle via balance-payment cron.)
 */
export function bookingChargeCents(
  totalCents: number,
  _options?: {
    checkIn?: string;
    gateEntry?: boolean;
    checkInTime?: string;
    now?: Date;
  }
): number {
  return Math.max(0, totalCents);
}

export function isReservationFullyPaid(paidCents: number, totalCents: number): boolean {
  return totalCents <= 0 || paidCents >= totalCents;
}
