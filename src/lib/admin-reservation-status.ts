export const ACTIVE_RESERVATION_STATUSES = [
  "pending_payment",
  "confirmed",
  "checked_in",
] as const;

export const COMPLETED_RESERVATION_STATUSES = [
  "checked_out",
  "cancelled",
  "expired",
] as const;

export type ActiveReservationStatus = (typeof ACTIVE_RESERVATION_STATUSES)[number];
export type CompletedReservationStatus = (typeof COMPLETED_RESERVATION_STATUSES)[number];
