import { cn } from "@/lib/utils";
import type { OccupancyDay } from "@/lib/admin-dashboard";

export function OccupancyChart({ data }: { data: OccupancyDay[] }) {
  const maxPercent = Math.max(...data.map((day) => day.percent), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48">
        {data.map((day) => (
          <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full">
            <span className="text-[10px] font-medium text-muted-foreground">{day.percent}%</span>
            <div className="flex-1 w-full flex items-end">
              <div
                className={cn(
                  "w-full rounded-t-md transition-colors",
                  day.percent >= 100
                    ? "bg-red-400"
                    : day.percent >= 70
                      ? "bg-amber-400"
                      : "bg-emerald-500"
                )}
                style={{ height: `${Math.max(8, (day.percent / maxPercent) * 100)}%` }}
                title={`${day.occupied}/${day.capacity} lugares`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {day.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Ocupação do parque (todas as zonas) — {data[0]?.occupied ?? 0} a {data[data.length - 1]?.occupied ?? 0}{" "}
        lugares ocupados · capacidade {data[0]?.capacity ?? 0}
      </p>
    </div>
  );
}
