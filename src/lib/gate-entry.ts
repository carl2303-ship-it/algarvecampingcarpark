import type { ParkSettings } from "@/lib/constants";
import { isOnlineBookingOpen } from "@/lib/park-settings";

export const GATE_QR_FROM = "qr";
export const RECEPTION_QR_FROM = "reception";

export function isGateQrEntry(from: string | null | undefined): boolean {
  return from === GATE_QR_FROM;
}

export function isReceptionQrEntry(from: string | null | undefined): boolean {
  return from === RECEPTION_QR_FROM;
}

/** Gate or reception QR — bypass closed online booking. */
export function isDeskQrEntry(from: string | null | undefined): boolean {
  return isGateQrEntry(from) || isReceptionQrEntry(from);
}

export function allowsPublicBooking(
  settings: ParkSettings,
  deskBypass: boolean,
  now?: Date
): boolean {
  return isOnlineBookingOpen(settings, now) || deskBypass;
}

export function gateEntryQuery(gateEntry: boolean): string {
  return gateEntry ? "gate_entry=1" : "";
}

export function appendGateEntryQuery(url: string, gateEntry: boolean): string {
  if (!gateEntry) return url;
  const param = gateEntryQuery(true);
  return url.includes("?") ? `${url}&${param}` : `${url}?${param}`;
}

export function appendPublicEntryQuery(
  url: string,
  options: { gateEntry?: boolean; receptionEntry?: boolean }
): string {
  if (options.gateEntry) return appendGateEntryQuery(url, true);
  if (options.receptionEntry) {
    return url.includes("?") ? `${url}&reception_entry=1` : `${url}?reception_entry=1`;
  }
  return url;
}

export function isPublicEntryRequest(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("gate_entry") === "1" || searchParams.get("reception_entry") === "1"
  );
}
