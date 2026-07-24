import { addDays, format, startOfToday } from "date-fns";
import { adminDateLocale } from "@/lib/admin-i18n";
import { TOTAL_CAPACITY } from "@/lib/constants";
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
  vehicle_plate: string | null;
  check_in: string;
  check_out: string;
  total_cents: number;
  paid_cents: number;
  status: string;
  zone_id: string;
  pitch_id: string | null;
  pitch_code: string | null;
  zone: { name: string } | null;
  pitch: { code: string } | null;
  /** True when another booking takes the same pitch on checkout day or the next day. */
  turnover_urgent: boolean;
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

function nextCalendarDay(isoDate: string): string {
  return format(addDays(new Date(`${isoDate}T12:00:00`), 1), "yyyy-MM-dd");
}

/** Marks rows that must leave on time because the pitch is booked again that day or the next. */
async function withTurnoverUrgent(
  rows: Omit<DashboardReservationRow, "turnover_urgent">[]
): Promise<DashboardReservationRow[]> {
  if (rows.length === 0) return [];

  const pitchCodes = [
    ...new Set(
      rows
        .map((row) => row.pitch_code ?? row.pitch?.code ?? null)
        .filter((code): code is string => Boolean(code))
    ),
  ];

  if (pitchCodes.length === 0) {
    return rows.map((row) => ({ ...row, turnover_urgent: false }));
  }

  const earliestOut = rows.reduce(
    (min, row) => (row.check_out < min ? row.check_out : min),
    rows[0].check_out
  );
  const latestNext = rows.reduce((max, row) => {
    const next = nextCalendarDay(row.check_out);
    return next > max ? next : max;
  }, nextCalendarDay(rows[0].check_out));

  const supabase = createAdminClient();
  const { data: followers } = await supabase
    .from("reservations")
    .select("id, pitch_code, check_in, status, expires_at")
    .in("pitch_code", pitchCodes)
    .in("status", ["confirmed", "checked_in", "pending_payment"])
    .gte("check_in", earliestOut)
    .lte("check_in", latestNext);

  const activeFollowers = (followers ?? []).filter((row) =>
    isActiveReservation(row.status, row.expires_at)
  );

  return rows.map((row) => {
    const pitch = row.pitch_code ?? row.pitch?.code ?? null;
    if (!pitch) return { ...row, turnover_urgent: false };

    const checkoutDay = row.check_out;
    const dayAfter = nextCalendarDay(checkoutDay);
    const turnover_urgent = activeFollowers.some(
      (follower) =>
        follower.id !== row.id &&
        follower.pitch_code === pitch &&
        (follower.check_in === checkoutDay || follower.check_in === dayAfter)
    );

    return { ...row, turnover_urgent };
  });
}

export async function getUpcomingDepartures(limit = 10): Promise<DashboardReservationRow[]> {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfToday(), 7), "yyyy-MM-dd");

  const { data } = await supabase
    .from("reservations")
    .select("id, guest_name, vehicle_plate, check_in, check_out, total_cents, paid_cents, status, zone_id, pitch_id, pitch_code, expires_at, zone:zones(name), pitch:pitches(code)")
    .in("status", ["confirmed", "checked_in"])
    .gte("check_out", today)
    .lte("check_out", weekEnd)
    .order("check_out")
    .limit(limit);

  const rows = ((data ?? []) as unknown as Omit<DashboardReservationRow, "turnover_urgent">[]).map(
    (row) => ({
      ...row,
      vehicle_plate: row.vehicle_plate ?? null,
      pitch_id: row.pitch_id ?? null,
      paid_cents: row.paid_cents ?? 0,
    })
  );

  return withTurnoverUrgent(rows);
}

export async function getUpcomingArrivals(limit = 10): Promise<DashboardReservationRow[]> {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfToday(), 7), "yyyy-MM-dd");

  const { data } = await supabase
    .from("reservations")
    .select("id, guest_name, vehicle_plate, check_in, check_out, total_cents, paid_cents, status, zone_id, pitch_id, pitch_code, expires_at, zone:zones(name), pitch:pitches(code)")
    .in("status", ["confirmed", "checked_in", "pending_payment"])
    .gte("check_in", today)
    .lte("check_in", weekEnd)
    .order("check_in")
    .limit(limit);

  const rows = ((data ?? []) as unknown as Omit<DashboardReservationRow, "turnover_urgent">[])
    .filter((row) =>
      isActiveReservation(
        row.status,
        (row as { expires_at?: string | null }).expires_at ?? null
      )
    )
    .map((row) => ({
      ...row,
      vehicle_plate: row.vehicle_plate ?? null,
      pitch_id: row.pitch_id ?? null,
      paid_cents: row.paid_cents ?? 0,
    }));

  return withTurnoverUrgent(rows);
}

/** Currently on site (check-in ≤ today ≤ check-out) with outstanding balance. */
export async function getOnSiteUnpaidReservations(
  limit = 20
): Promise<DashboardReservationRow[]> {
  const supabase = createAdminClient();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data } = await supabase
    .from("reservations")
    .select(
      "id, guest_name, vehicle_plate, check_in, check_out, total_cents, paid_cents, status, zone_id, pitch_id, pitch_code, expires_at, zone:zones(name), pitch:pitches(code)"
    )
    .in("status", ["confirmed", "checked_in"])
    .lte("check_in", today)
    .gte("check_out", today)
    .order("check_out")
    .limit(100);

  const rows = ((data ?? []) as unknown as Omit<DashboardReservationRow, "turnover_urgent">[])
    .map((row) => ({
      ...row,
      vehicle_plate: row.vehicle_plate ?? null,
      pitch_id: row.pitch_id ?? null,
      paid_cents: row.paid_cents ?? 0,
    }))
    .filter((row) => row.total_cents > 0 && row.paid_cents < row.total_cents)
    .slice(0, limit);

  return withTurnoverUrgent(rows);
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

  const totalCapacity = zones?.reduce((sum, zone) => sum + zone.capacity, 0) ?? TOTAL_CAPACITY;

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
      label: format(day, "dd MMM", { locale: adminDateLocale }),
      occupied,
      capacity: totalCapacity,
      percent,
    };
  });
}
