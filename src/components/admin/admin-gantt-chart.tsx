"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  parseISO,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { GanttReservationDialog } from "@/components/admin/gantt-reservation-dialog";
import { adminDateLocale, adminT } from "@/lib/admin-i18n";
import type { GanttOccupancyReservation } from "@/lib/gantt-occupancy";
import { getZoneVisual } from "@/lib/pricing-icons";
import {
  SEASON_BG,
  SEASON_LABELS,
  type RateSeason,
} from "@/lib/season-calendar";
import { cn } from "@/lib/utils";

export type GanttReservation = GanttOccupancyReservation;

export type GanttPitch = {
  code: string;
  zone_slug: string;
};

const WEEK_STARTS_ON = 1 as const;

function GanttBar({
  reservation,
  totalDays,
  startStr,
  endStr,
  onSelect,
}: {
  reservation: GanttReservation;
  totalDays: number;
  startStr: string;
  endStr: string;
  onSelect: (reservation: GanttReservation) => void;
}) {
  const isVisible = !(reservation.check_out <= startStr || reservation.check_in >= endStr);

  const visibleStart = reservation.check_in < startStr ? startStr : reservation.check_in;
  const visibleEnd = reservation.check_out > endStr ? endStr : reservation.check_out;

  const offset = isVisible
    ? Math.max(0, differenceInCalendarDays(parseISO(visibleStart), parseISO(startStr)))
    : 0;
  const span = isVisible
    ? Math.max(1, differenceInCalendarDays(parseISO(visibleEnd), parseISO(visibleStart)))
    : 1;

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(reservation)}
      className={cn(
        "absolute top-1.5 z-10 flex h-7 cursor-pointer items-center truncate rounded-md px-2 text-[10px] font-medium text-white shadow-sm transition-opacity hover:opacity-90",
        reservation.status === "checked_in" ? "bg-red-500" : "bg-primary"
      )}
      style={{
        left: `${(offset / totalDays) * 100}%`,
        width: `${(span / totalDays) * 100}%`,
      }}
      title={`${reservation.guest_name} · ${reservation.check_in} → ${reservation.check_out}`}
    >
      <span className="truncate">{reservation.guest_name}</span>
    </button>
  );
}

function SeasonLegend() {
  const seasons: RateSeason[] = ["august", "summer", "low", "winter"];

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{adminT.timeline.seasonLegend}</span>
      {seasons.map((season) => (
        <span key={season} className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded border border-black/5"
            style={{ backgroundColor: SEASON_BG[season] }}
          />
          {SEASON_LABELS[season]}
        </span>
      ))}
    </div>
  );
}

function SeasonDayBackground({
  weekColumns,
  seasonsByDay,
  rangeStart,
}: {
  weekColumns: Date[];
  seasonsByDay: (RateSeason | null)[];
  rangeStart: Date;
}) {
  return (
    <div className="absolute inset-0 flex">
      {weekColumns.map((week, weekIndex) => (
        <div key={week.toISOString()} className="flex min-w-[72px] flex-1">
          {Array.from({ length: 7 }, (_, dayOffset) => {
            const dayIndex = weekIndex * 7 + dayOffset;
            const season = seasonsByDay[dayIndex] ?? null;
            return (
              <div
                key={dayOffset}
                className="flex-1 border-r border-black/[0.03] last:border-r-0"
                style={{
                  backgroundColor: season ? SEASON_BG[season] : undefined,
                }}
                title={
                  season
                    ? `${format(addDays(rangeStart, dayIndex), "dd/MM")} · ${SEASON_LABELS[season]}`
                    : format(addDays(rangeStart, dayIndex), "dd/MM")
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AdminGanttChart({
  pitches,
  reservations,
  seasonsByDay,
  weeks = 12,
}: {
  pitches: GanttPitch[];
  reservations: GanttReservation[];
  seasonsByDay: (RateSeason | null)[];
  weeks?: number;
}) {
  const [selectedReservation, setSelectedReservation] = useState<GanttReservation | null>(null);

  const rangeStart = useMemo(
    () => startOfWeek(startOfToday(), { weekStartsOn: WEEK_STARTS_ON }),
    []
  );

  const totalDays = weeks * 7;

  const weekColumns = useMemo(
    () => Array.from({ length: weeks }, (_, index) => addWeeks(rangeStart, index)),
    [rangeStart, weeks]
  );

  const sortedPitches = useMemo(
    () =>
      [...pitches].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      ),
    [pitches]
  );

  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(addDays(rangeStart, totalDays), "yyyy-MM-dd");

  return (
    <div className="space-y-3">
      <SeasonLegend />

      <div className="overflow-x-auto rounded-xl border bg-background -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[720px]">
          <div className="flex border-b bg-muted/50">
            <div className="w-14 shrink-0 border-r p-2 text-xs font-medium sm:w-16">
              {adminT.timeline.pitchColumn}
            </div>
            <div className="flex flex-1">
              {weekColumns.map((week) => {
                const weekEnd = endOfWeek(week, { weekStartsOn: WEEK_STARTS_ON });
                return (
                  <div
                    key={week.toISOString()}
                    className="min-w-[72px] flex-1 border-r p-1.5 text-center text-[10px] text-muted-foreground"
                  >
                    <div className="text-[11px] font-medium text-foreground">
                      {format(week, "d", { locale: adminDateLocale })} –{" "}
                      {format(weekEnd, "d MMM", { locale: adminDateLocale })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {sortedPitches.map((pitch) => {
            const pitchReservations = reservations.filter((r) => r.pitch_code === pitch.code);
            const zoneVisual = getZoneVisual(pitch.zone_slug);

            return (
              <div key={pitch.code} className="flex min-h-[40px] border-b">
                <div className="flex w-14 shrink-0 items-center border-r p-1.5 sm:w-16">
                  <span
                    className={cn(
                      "inline-flex min-w-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                      zoneVisual.color
                    )}
                  >
                    {pitch.code}
                  </span>
                </div>
                <div className="relative min-h-[40px] flex-1">
                  <SeasonDayBackground
                    weekColumns={weekColumns}
                    seasonsByDay={seasonsByDay}
                    rangeStart={rangeStart}
                  />
                  <div className="pointer-events-none absolute inset-0 flex">
                    {weekColumns.map((week) => (
                      <div
                        key={week.toISOString()}
                        className="min-w-[72px] flex-1 border-r border-muted/40"
                      />
                    ))}
                  </div>

                  {pitchReservations.map((reservation) => (
                    <GanttBar
                      key={reservation.id}
                      reservation={reservation}
                      totalDays={totalDays}
                      startStr={startStr}
                      endStr={endStr}
                      onSelect={setSelectedReservation}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GanttReservationDialog
        reservation={selectedReservation}
        open={selectedReservation !== null}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
      />
    </div>
  );
}
