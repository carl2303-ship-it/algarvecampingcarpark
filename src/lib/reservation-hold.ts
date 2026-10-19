/** Habitual-client hold: pitch stays occupied until manual checkout. */

export type ReservationHoldFields = {
  check_in: string;
  check_out: string;
  manual_checkout_required?: boolean | null;
};

/** True when a stay overlaps [rangeStart, rangeEnd) for availability / conflict checks. */
export function reservationBlocksDateRange(
  reservation: ReservationHoldFields,
  rangeStart: string,
  rangeEnd: string
): boolean {
  if (reservation.check_in >= rangeEnd) return false;
  if (reservation.manual_checkout_required) return true;
  return reservation.check_out > rangeStart;
}

/** True when the stay occupies a calendar night (half-open: check_in <= day < check_out). */
export function reservationOccupiesDay(
  reservation: ReservationHoldFields,
  day: string
): boolean {
  if (reservation.check_in > day) return false;
  if (reservation.manual_checkout_required) return true;
  return reservation.check_out > day;
}

/** True when the stay should still show on the park status map for `date`. */
export function reservationOnSiteOnDate(
  reservation: ReservationHoldFields,
  date: string
): boolean {
  if (reservation.check_in > date) return false;
  if (reservation.manual_checkout_required) return true;
  return reservation.check_out >= date;
}

/**
 * Habitual client past paid departure: still on site (no manual checkout),
 * extension must be arranged/paid.
 */
export function isHabitualOverstay(
  reservation: Pick<ReservationHoldFields, "check_out" | "manual_checkout_required">,
  today: string
): boolean {
  return Boolean(reservation.manual_checkout_required) && reservation.check_out <= today;
}

/** Calendar date in Europe/Lisbon (park local day). */
export function lisbonToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
