import { addDays, addWeeks, format, startOfToday, startOfWeek } from "date-fns";
import { AdminGanttChart } from "@/components/admin/admin-gantt-chart";
import { GanttZoneOccupancy } from "@/components/admin/gantt-zone-occupancy";
import { adminT } from "@/lib/admin-i18n";
import { getActiveZones, getZoneRates } from "@/lib/availability";
import { peakOccupancyForWeek, type GanttOccupancyReservation } from "@/lib/gantt-occupancy";
import { getSpotZoneSlug } from "@/lib/park-pitch-map-defaults";
import { getPitchMapSpots } from "@/lib/pitch-map";
import { buildSeasonsByDay } from "@/lib/season-calendar";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const GANTT_WEEKS = 12;
const WEEK_STARTS_ON = 1 as const;

export default async function TimelinePage() {
  const supabase = createAdminClient();
  const rangeStart = startOfWeek(startOfToday(), { weekStartsOn: WEEK_STARTS_ON });
  const today = format(startOfToday(), "yyyy-MM-dd");
  const horizon = format(addDays(rangeStart, GANTT_WEEKS * 7), "yyyy-MM-dd");
  const weekStarts = Array.from({ length: GANTT_WEEKS }, (_, index) =>
    addWeeks(rangeStart, index)
  );

  const [spots, zones, { data: timelineReservations }] = await Promise.all([
    getPitchMapSpots(),
    getActiveZones(),
    supabase
      .from("reservations")
      .select(
        "id, zone_id, pitch_code, guest_name, guest_phone, vehicle_plate, check_in, check_out, status, payment_status, expires_at"
      )
      .in("status", ["confirmed", "checked_in", "pending_payment"])
      .lt("check_in", horizon)
      .gt("check_out", today)
      .order("check_in"),
  ]);

  const reservations = (timelineReservations ?? []) as GanttOccupancyReservation[];
  const ganttReservations = reservations.filter(
    (reservation) =>
      reservation.pitch_code && ["confirmed", "checked_in"].includes(reservation.status)
  );

  const rates = zones[0] ? await getZoneRates(zones[0].id) : [];
  const seasonsByDay = buildSeasonsByDay(rates, rangeStart, GANTT_WEEKS * 7);

  const occupancyByZone = zones.map((zone) => ({
    zoneId: zone.id,
    zoneName: zone.name,
    capacity: zone.capacity,
    weeks: weekStarts.map((weekStart) => ({
      weekStart: format(weekStart, "yyyy-MM-dd"),
      count: peakOccupancyForWeek(zone.id, weekStart, reservations),
    })),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{adminT.timeline.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {adminT.timeline.description}
        </p>
      </div>

      <GanttZoneOccupancy
        zones={occupancyByZone}
        weekStarts={weekStarts}
        reservations={reservations}
      />

      <AdminGanttChart
        pitches={spots.map((spot) => ({
          code: spot.code,
          zone_slug: getSpotZoneSlug(spot),
        }))}
        reservations={ganttReservations}
        seasonsByDay={seasonsByDay}
        weeks={GANTT_WEEKS}
      />
    </div>
  );
}
