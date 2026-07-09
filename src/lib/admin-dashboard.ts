import { addDays, format, startOfToday } from "date-fns";
import { pt } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";

export type OccupancyDay = {
  date: string;
  label: string;
  occupied: number;
  capacity: number;
  percent: number;
};

export type DashboardReservationRow = {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  total_cents: number;
  status: string;
  pitch_code: string | null;
  zone: { name: string } | null;
  pitch: { code: string } | null;
};

function isActiveReservation(
  status: string,
  expires_at: string | null
): boolean {
  if (status === "pending_payment") {
    return Boolean(expires_at && expires_at > new Date().toISOString());
  }
  return ["confirmed", "checked_in", "pending_payment"].includes(status);
}

export async function getUpcomingDepartures(limit = 10): Promise<DashboardReservationRow[]> {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfToday(), 7), "yyyy-MM-dd");

  const { data } = await supabase
    .from("reservations")
    .select("id, guest_name, check_in, check_out, total_cents, status, pitch_code, expires_at, zone:zones(name), pitch:pitches(code)")
    .in("status", ["confirmed", "checked_in"])
    .gte("check_out", today)
    .lte("check_out", weekEnd)
    .order("check_out")
    .limit(limit);

  return (data ?? []) as unknown as DashboardReservationRow[];
}

export async function getUpcomingArrivals(limit = 10): Promise<DashboardReservationRow[]> {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfToday(), 7), "yyyy-MM-dd");

  const { data } = await supabase
    .from("reservations")
    .select("id, guest_name, check_in, check_out, total_cents, status, pitch_code, expires_at, zone:zones(name), pitch:pitches(code)")
    .in("status", ["confirmed", "checked_in", "pending_payment"])
    .gte("check_in", today)
    .lte("check_in", weekEnd)
    .order("check_in")
    .limit(limit);

  return (data ?? []).filter((row) =>
    isActiveReservation(row.status, (row as { expires_at?: string | null }).expires_at ?? null)
  ) as unknown as DashboardReservationRow[];
}

export async function getOccupancySeries(days = 14): Promise<OccupancyDay[]> {
  const supabase = createAdminClient();
  const today = startOfToday();
  const startDate = format(today, "yyyy-MM-dd");
  const endDate = format(addDays(today, days), "yyyy-MM-dd");

  const [{ data: zones }, { data: reservations }] = await Promise.all([
    supabase.from("zones").select("id, capacity").eq("active", true),
    supabase
      .from("reservations")
      .select("zone_id, check_in, check_out, status, expires_at")
      .in("status", ["confirmed", "checked_in", "pending_payment"])
      .lt("check_in", endDate)
      .gt("check_out", startDate),
  ]);

  const totalCapacity = zones?.reduce((sum, zone) => sum + zone.capacity, 0) ?? 57;

  return Array.from({ length: days }, (_, index) => {
    const day = addDays(today, index);
    const dayStr = format(day, "yyyy-MM-dd");

    const occupied =
      reservations?.filter((reservation) => {
        if (!isActiveReservation(reservation.status, reservation.expires_at)) return false;
        return reservation.check_in <= dayStr && reservation.check_out > dayStr;
      }).length ?? 0;

    const percent = totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0;

    return {
      date: dayStr,
      label: format(day, "dd MMM", { locale: pt }),
      occupied,
      capacity: totalCapacity,
      percent,
    };
  });
}
