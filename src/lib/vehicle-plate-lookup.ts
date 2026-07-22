import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeVehiclePlate } from "@/lib/admin-reservation-payments";
import { ACTIVE_RESERVATION_STATUSES } from "@/lib/admin-reservation-status";

export type PlateGuestProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  vehicle_plate: string;
};

export type ActivePlateReservation = {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  pitch_code: string | null;
  status: string;
};

export type PlateLookupResult = {
  plate: string;
  guest: PlateGuestProfile | null;
  activeReservation: ActivePlateReservation | null;
};

export async function findGuestByPlate(
  supabase: SupabaseClient,
  rawPlate: string
): Promise<PlateGuestProfile | null> {
  const plate = normalizeVehiclePlate(rawPlate);
  if (!plate) return null;

  const { data } = await supabase
    .from("guests")
    .select("id, name, email, phone, country, vehicle_plate")
    .eq("vehicle_plate", plate)
    .maybeSingle();

  if (data) {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      country: data.country,
      vehicle_plate: data.vehicle_plate ?? plate,
    };
  }

  // Fallback: latest reservation with this plate
  const { data: reservations } = await supabase
    .from("reservations")
    .select("guest_name, guest_email, guest_phone, vehicle_plate, created_at")
    .not("vehicle_plate", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const match = (reservations ?? []).find(
    (row) => normalizeVehiclePlate(row.vehicle_plate ?? "") === plate
  );

  if (!match?.guest_email || !match.guest_name) return null;

  return {
    id: "",
    name: match.guest_name,
    email: match.guest_email,
    phone: match.guest_phone,
    country: null,
    vehicle_plate: plate,
  };
}

export async function findActiveReservationByPlate(
  supabase: SupabaseClient,
  rawPlate: string,
  options?: { excludeReservationId?: string | null }
): Promise<ActivePlateReservation | null> {
  const plate = normalizeVehiclePlate(rawPlate);
  if (!plate) return null;

  const { data, error } = await supabase
    .from("reservations")
    .select("id, guest_name, check_in, check_out, pitch_code, status, vehicle_plate, expires_at")
    .in("status", [...ACTIVE_RESERVATION_STATUSES])
    .not("vehicle_plate", "is", null)
    .order("check_in", { ascending: true });

  if (error) throw error;

  const now = Date.now();
  const match = (data ?? []).find((row) => {
    if (normalizeVehiclePlate(row.vehicle_plate ?? "") !== plate) return false;
    if (options?.excludeReservationId && row.id === options.excludeReservationId) {
      return false;
    }
    // Ignore expired pending payments
    if (
      row.status === "pending_payment" &&
      row.expires_at &&
      new Date(row.expires_at).getTime() < now
    ) {
      return false;
    }
    return true;
  });

  if (!match) return null;

  return {
    id: match.id,
    guest_name: match.guest_name,
    check_in: match.check_in,
    check_out: match.check_out,
    pitch_code: match.pitch_code,
    status: match.status,
  };
}

export async function lookupVehiclePlate(
  supabase: SupabaseClient,
  rawPlate: string,
  options?: { excludeReservationId?: string | null }
): Promise<PlateLookupResult | null> {
  const plate = normalizeVehiclePlate(rawPlate);
  if (!plate) return null;

  const [guest, activeReservation] = await Promise.all([
    findGuestByPlate(supabase, plate),
    findActiveReservationByPlate(supabase, plate, options),
  ]);

  return { plate, guest, activeReservation };
}
