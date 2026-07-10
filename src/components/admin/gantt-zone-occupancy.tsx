"use client";

import { useMemo, useState } from "react";
import { endOfWeek, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GanttReservationDialog,
  GanttZoneWeekDialog,
} from "@/components/admin/gantt-reservation-dialog";
import { adminDateLocale, adminT } from "@/lib/admin-i18n";
import {
  occupancyBackgroundColor,
  reservationsActiveInWeek,
  type GanttOccupancyReservation,
} from "@/lib/gantt-occupancy";
import { cn } from "@/lib/utils";

export type ZoneWeekOccupancy = {
  zoneId: string;
  zoneName: string;
  capacity: number;
  weeks: { count: number; weekStart: string }[];
};

const WEEK_STARTS_ON = 1 as const;

type WeekSelection = {
  zoneId: string;
  zoneName: string;
  weekStart: string;
  weekLabel: string;
};

export function GanttZoneOccupancy({
  zones,
  weekStarts,
  reservations,
}: {
  zones: ZoneWeekOccupancy[];
  weekStarts: Date[];
  reservations: GanttOccupancyReservation[];
}) {
  const [weekSelection, setWeekSelection] = useState<WeekSelection | null>(null);
  const [detailReservation, setDetailReservation] = useState<GanttOccupancyReservation | null>(
    null
  );

  const weekReservations = useMemo(() => {
    if (!weekSelection) return [];
    const weekStart = weekStarts.find((week) => format(week, "yyyy-MM-dd") === weekSelection.weekStart);
    if (!weekStart) return [];
    return reservationsActiveInWeek(weekSelection.zoneId, weekStart, reservations);
  }, [weekSelection, weekStarts, reservations]);

  function openWeek(zone: ZoneWeekOccupancy, weekIndex: number) {
    const weekStart = weekStarts[weekIndex];
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
    setWeekSelection({
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      weekStart: format(weekStart, "yyyy-MM-dd"),
      weekLabel: `${format(weekStart, "d", { locale: adminDateLocale })} – ${format(weekEnd, "d MMM yyyy", { locale: adminDateLocale })}`,
    });
  }

  function handleSelectReservation(reservation: GanttOccupancyReservation) {
    setWeekSelection(null);
    setDetailReservation(reservation);
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{adminT.timeline.occupancyTitle}</h2>
          <p className="text-sm text-muted-foreground">{adminT.timeline.occupancySubtitle}</p>
        </div>

        {zones.map((zone) => (
          <Card key={zone.zoneId}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{zone.zoneName}</span>
                <Badge variant="outline">
                  {adminT.common.capacity} {zone.capacity}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${weekStarts.length}, minmax(0, 1fr))` }}
              >
                {zone.weeks.map((week, index) => {
                  const weekStart = weekStarts[index];
                  const weekEnd = endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
                  const percent = zone.capacity > 0 ? (week.count / zone.capacity) * 100 : 0;

                  return (
                    <button
                      key={week.weekStart}
                      type="button"
                      onClick={() => openWeek(zone, index)}
                      className={cn(
                        "rounded-lg border p-2 text-center text-xs transition-colors",
                        "hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      )}
                      style={{ backgroundColor: occupancyBackgroundColor(percent) }}
                    >
                      <p className="font-medium text-[10px] leading-tight text-muted-foreground">
                        {format(weekStart, "d", { locale: adminDateLocale })} –{" "}
                        {format(weekEnd, "d MMM", { locale: adminDateLocale })}
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {week.count}/{zone.capacity}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <GanttZoneWeekDialog
        zoneName={weekSelection?.zoneName ?? ""}
        weekLabel={weekSelection?.weekLabel ?? ""}
        reservations={weekReservations}
        open={weekSelection !== null}
        onOpenChange={(open) => !open && setWeekSelection(null)}
        onSelectReservation={handleSelectReservation}
      />

      <GanttReservationDialog
        reservation={detailReservation}
        open={detailReservation !== null}
        onOpenChange={(open) => !open && setDetailReservation(null)}
      />
    </>
  );
}
