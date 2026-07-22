import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeVehiclePlate } from "@/lib/admin-reservation-payments";
import type { Guest } from "@/types/database";

type ReservationGuestSource = {
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  vehicle_plate: string | null;
};

/**
 * Ensure guests rows exist for reservations that have a plate but no matching guest.
 * Identity key is the normalized vehicle plate.
 */
export async function syncGuestsFromReservations(supabase: SupabaseClient): Promise<number> {
  const [{ data: reservations }, { data: guests }] = await Promise.all([
    supabase
      .from("reservations")
      .select("guest_name, guest_email, guest_phone, vehicle_plate")
      .not("vehicle_plate", "is", null),
    supabase.from("guests").select("id, vehicle_plate"),
  ]);

  const plateToGuestId = new Map<string, string>();
  for (const guest of guests ?? []) {
    const plate = normalizeVehiclePlate(guest.vehicle_plate ?? "");
    if (plate) plateToGuestId.set(plate, guest.id);
  }

  const toInsert: Array<{
    name: string;
    email: string;
    phone: string | null;
    vehicle_plate: string;
    country: null;
  }> = [];

  const seenPlates = new Set(plateToGuestId.keys());

  for (const reservation of (reservations ?? []) as ReservationGuestSource[]) {
    const plate = normalizeVehiclePlate(reservation.vehicle_plate ?? "");
    if (!plate || seenPlates.has(plate)) continue;
    if (!reservation.guest_email?.trim() || !reservation.guest_name?.trim()) continue;

    seenPlates.add(plate);
    toInsert.push({
      name: reservation.guest_name.trim(),
      email: reservation.guest_email.trim(),
      phone: reservation.guest_phone?.trim() || null,
      vehicle_plate: plate,
      country: null,
    });
  }

  if (toInsert.length === 0) return 0;

  const { error } = await supabase.from("guests").insert(toInsert);
  if (error) {
    console.error("syncGuestsFromReservations insert error:", error);
    throw error;
  }

  return toInsert.length;
}

export async function listGuests(supabase: SupabaseClient): Promise<Guest[]> {
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, email, phone, vehicle_plate, country, is_habitual, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Guest[]).map((guest) => ({
    ...guest,
    is_habitual: Boolean(guest.is_habitual),
  }));
}
