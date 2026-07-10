import { addDays, format } from "date-fns";

export type GanttOccupancyReservation = {
  id: string;
  zone_id: string;
  pitch_code: string | null;
  guest_name: string;
  guest_phone: string | null;
  vehicle_plate: string | null;
  check_in: string;
  check_out: string;
  status: string;
  payment_status: string;
  expires_at?: string | null;
};

export function isCountableReservation(
  reservation: Pick<GanttOccupancyReservation, "status" | "expires_at">,
  nowIso = new Date().toISOString()
): boolean {
  return (
    reservation.status !== "pending_payment" ||
    !!(reservation.expires_at && reservation.expires_at > nowIso)
  );
}

export function reservationsActiveInWeek(
  zoneId: string,
  weekStart: Date,
  reservations: GanttOccupancyReservation[]
): GanttOccupancyReservation[] {
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  return reservations
    .filter(
      (reservation) =>
        reservation.zone_id === zoneId &&
        reservation.check_in <= weekEndStr &&
        reservation.check_out > weekStartStr &&
        isCountableReservation(reservation)
    )
    .sort(
      (a, b) =>
        a.check_in.localeCompare(b.check_in) || a.guest_name.localeCompare(b.guest_name)
    );
}

export function countOccupiedForDay(
  zoneId: string,
  day: Date,
  reservations: GanttOccupancyReservation[]
): number {
  const dayStr = format(day, "yyyy-MM-dd");

  return reservations.filter(
    (reservation) =>
      reservation.zone_id === zoneId &&
      reservation.check_in <= dayStr &&
      reservation.check_out > dayStr &&
      isCountableReservation(reservation)
  ).length;
}

export function peakOccupancyForWeek(
  zoneId: string,
  weekStart: Date,
  reservations: GanttOccupancyReservation[]
): number {
  let peak = 0;
  for (let offset = 0; offset < 7; offset++) {
    const count = countOccupiedForDay(zoneId, addDays(weekStart, offset), reservations);
    peak = Math.max(peak, count);
  }
  return peak;
}

export function occupancyBackgroundColor(percent: number): string {
  if (percent >= 100) return "rgb(254 202 202)";
  if (percent >= 70) return "rgb(254 243 199)";
  return "rgb(220 252 231)";
}
