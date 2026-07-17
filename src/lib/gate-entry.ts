import type { ParkSettings } from "@/lib/constants";
import { isOnlineBookingOpen } from "@/lib/park-settings";

export const GATE_QR_FROM = "qr";

export function isGateQrEntry(from: string | null | undefined): boolean {
  return from === GATE_QR_FROM;
}

export function allowsPublicBooking(
  settings: ParkSettings,
  gateEntry: boolean,
  now?: Date
): boolean {
  return isOnlineBookingOpen(settings, now) || gateEntry;
}

export function gateEntryQuery(gateEntry: boolean): string {
  return gateEntry ? "gate_entry=1" : "";
}

export function appendGateEntryQuery(url: string, gateEntry: boolean): string {
  if (!gateEntry) return url;
  const param = gateEntryQuery(true);
  return url.includes("?") ? `${url}&${param}` : `${url}?${param}`;
}
