import { format, startOfToday } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPitchMapSpots } from "@/lib/pitch-map";
import type { PitchMapSpot } from "@/lib/park-pitch-map-defaults";

export type PitchOperationalStatus = "free" | "occupied" | "checkout_today" | "maintenance";

export type PitchWithBooking = PitchMapSpot & {
  status: "available" | "occupied" | "maintenance";
  category: string | null;
  max_amperage: number;
  operational_status: PitchOperationalStatus;
  reservation: {
    id: string;
    guest_name: string;
    guest_phone: string;
    vehicle_plate: string | null;
    check_in: string;
    check_out: string;
    operational_notes: string | null;
    payment_status: string;
  } | null;
};

export async function getPitchesWithOperationalStatus(
  date = format(startOfToday(), "yyyy-MM-dd")
): Promise<PitchWithBooking[]> {
  const supabase = createAdminClient();
  const spots = await getPitchMapSpots();

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      "id, pitch_code, guest_name, guest_phone, vehicle_plate, check_in, check_out, operational_notes, payment_status, status"
    )
    .in("status", ["confirmed", "checked_in", "pending_payment"])
    .lte("check_in", date)
    .gt("check_out", date);

  const { data: spotRows } = await supabase
    .from("pitch_map_spots")
    .select("code, status, category, max_amperage");

  const spotMeta = new Map(
    (spotRows ?? []).map((row) => [
      row.code,
      {
        status: (row.status as PitchWithBooking["status"]) ?? "available",
        category: row.category as string | null,
        max_amperage: Number(row.max_amperage ?? 16),
      },
    ])
  );

  const reservationByPitch = new Map<string, NonNullable<typeof reservations>[number]>();
  for (const reservation of reservations ?? []) {
    if (!reservation.pitch_code) continue;
    if (reservation.status === "pending_payment") continue;
    reservationByPitch.set(reservation.pitch_code, reservation);
  }

  const checkoutToday = reservations?.filter(
    (r) => r.check_out === date && r.pitch_code && ["confirmed", "checked_in"].includes(r.status)
  );

  const checkoutSet = new Set(checkoutToday?.map((r) => r.pitch_code) ?? []);

  return spots.map((spot) => {
    const meta = spotMeta.get(spot.code);
    const reservation = reservationByPitch.get(spot.code) ?? null;
    const dbStatus = meta?.status ?? "available";

    let operational_status: PitchOperationalStatus = "free";
    if (dbStatus === "maintenance") {
      operational_status = "maintenance";
    } else if (checkoutSet.has(spot.code) && reservation) {
      operational_status = "checkout_today";
    } else if (reservation) {
      operational_status = "occupied";
    }

    return {
      ...spot,
      status: dbStatus,
      category: meta?.category ?? null,
      max_amperage: meta?.max_amperage ?? (spot.electric ? 16 : 0),
      operational_status,
      reservation: reservation
        ? {
            id: reservation.id,
            guest_name: reservation.guest_name,
            guest_phone: reservation.guest_phone,
            vehicle_plate: reservation.vehicle_plate,
            check_in: reservation.check_in,
            check_out: reservation.check_out,
            operational_notes: reservation.operational_notes,
            payment_status: reservation.payment_status,
          }
        : null,
    };
  });
}
