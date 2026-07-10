import { format } from "date-fns";
import { getRateForDate } from "@/lib/pricing";
import type { ZoneRate } from "@/types/database";

export type RateSeason = ZoneRate["season"];

/** Light background tints for Gantt day columns */
export const SEASON_BG: Record<RateSeason, string> = {
  august: "rgba(251, 191, 36, 0.18)",
  summer: "rgba(251, 146, 60, 0.16)",
  low: "rgba(147, 197, 253, 0.2)",
  winter: "rgba(165, 180, 252, 0.18)",
};

export const SEASON_LABELS: Record<RateSeason, string> = {
  august: "Août",
  summer: "Été",
  low: "Basse saison",
  winter: "Hiver",
};

export function getSeasonForDate(rates: ZoneRate[], date: string): RateSeason | null {
  return getRateForDate(rates, date)?.season ?? null;
}

export function buildSeasonsByDay(
  rates: ZoneRate[],
  rangeStart: Date,
  totalDays: number
): (RateSeason | null)[] {
  return Array.from({ length: totalDays }, (_, index) => {
    const date = format(
      new Date(rangeStart.getTime() + index * 86_400_000),
      "yyyy-MM-dd"
    );
    return getSeasonForDate(rates, date);
  });
}

export function getSeasonForWeekMonday(
  rates: ZoneRate[],
  weekStart: Date
): RateSeason | null {
  return getSeasonForDate(rates, format(weekStart, "yyyy-MM-dd"));
}
