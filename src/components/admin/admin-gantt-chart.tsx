"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfToday,
} from "date-fns";
import { pt } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/pricing";

export type GanttReservation = {
  id: string;
  pitch_code: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
};

export type GanttPitch = {
  code: string;
};

function GanttBar({
  reservation,
  start,
  days,
  startStr,
  endStr,
  onExtend,
}: {
  reservation: GanttReservation;
  start: Date;
  days: number;
  startStr: string;
  endStr: string;
  onExtend: (id: string, newCheckOut: string) => Promise<void>;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewCheckOut, setPreviewCheckOut] = useState<string | null>(null);

  if (reservation.check_out <= startStr || reservation.check_in >= endStr) {
    return null;
  }

  const visibleStart = reservation.check_in < startStr ? startStr : reservation.check_in;
  const visibleEnd = reservation.check_out > endStr ? endStr : reservation.check_out;

  const offset = Math.max(0, differenceInCalendarDays(parseISO(visibleStart), parseISO(startStr)));
  const span = Math.max(
    1,
    differenceInCalendarDays(parseISO(visibleEnd), parseISO(visibleStart))
  );

  const previewSpan =
    previewCheckOut && previewCheckOut > reservation.check_out
      ? Math.max(
          span,
          differenceInCalendarDays(parseISO(previewCheckOut), parseISO(startStr)) - offset
        )
      : span;

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const row = barRef.current?.parentElement;
      if (!row) return;
      const rect = row.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const dayIndex = Math.min(
        days,
        Math.max(1, Math.ceil((relativeX / rect.width) * days))
      );
      const newCheckOut = format(addDays(start, dayIndex), "yyyy-MM-dd");
      if (newCheckOut > reservation.check_out) {
        setPreviewCheckOut(newCheckOut);
      }
    },
    [days, reservation.check_out, start]
  );

  const handlePointerUp = useCallback(async () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    setDragging(false);

    if (previewCheckOut && previewCheckOut > reservation.check_out) {
      await onExtend(reservation.id, previewCheckOut);
    }
    setPreviewCheckOut(null);
  }, [handlePointerMove, onExtend, previewCheckOut, reservation.check_out, reservation.id]);

  const startDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      ref={barRef}
      className={cn(
        "absolute top-1.5 h-7 rounded-md flex items-center text-[10px] font-medium text-white truncate shadow-sm z-10 group",
        reservation.status === "checked_in" ? "bg-red-500" : "bg-primary",
        dragging && "ring-2 ring-white/80"
      )}
      style={{
        left: `${(offset / days) * 100}%`,
        width: `${(previewSpan / days) * 100}%`,
      }}
      title={`${reservation.guest_name} · ${reservation.check_in} → ${previewCheckOut ?? reservation.check_out}`}
    >
      <span className="truncate px-2 flex-1">{reservation.guest_name}</span>
      <button
        type="button"
        onPointerDown={startDrag}
        className="h-full w-3 shrink-0 cursor-ew-resize bg-black/20 hover:bg-black/40 rounded-r-md touch-none"
        aria-label={`Prolongar estadia de ${reservation.guest_name}`}
      />
    </div>
  );
}

export function AdminGanttChart({
  pitches,
  reservations,
  days = 21,
}: {
  pitches: GanttPitch[];
  reservations: GanttReservation[];
  days?: number;
}) {
  const router = useRouter();
  const start = useMemo(() => startOfToday(), []);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dayColumns = useMemo(
    () => Array.from({ length: days }, (_, index) => addDays(start, index)),
    [start, days]
  );

  const sortedPitches = useMemo(
    () =>
      [...pitches].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      ),
    [pitches]
  );

  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(addDays(start, days), "yyyy-MM-dd");

  const handleExtend = useCallback(
    async (id: string, newCheckOut: string) => {
      setExtendingId(id);
      setMessage(null);
      try {
        const res = await fetch(`/api/admin/reservations/${id}/extend`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check_out: newCheckOut, send_payment_link: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao prolongar");

        const extra =
          data.extension_cents > 0
            ? ` Valor adicional: ${formatPrice(data.extension_cents)}. Link enviado por email.`
            : "";
        setMessage(`Estadia prolongada até ${newCheckOut}.${extra}`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erro ao prolongar estadia");
      } finally {
        setExtendingId(null);
      }
    },
    [router]
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Arraste a ponta direita de uma barra para prolongar a estadia. O valor extra é calculado
        automaticamente e um link Stripe é enviado ao hóspede.
      </p>

      {message && (
        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">{message}</div>
      )}

      {extendingId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A prolongar estadia…
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-background">
        <div className="min-w-[960px]">
          <div className="flex border-b bg-muted/50">
            <div className="w-16 shrink-0 p-2 text-xs font-medium border-r">Lugar</div>
            <div className="flex flex-1">
              {dayColumns.map((day) => (
                <div
                  key={day.toISOString()}
                  className="flex-1 min-w-[36px] border-r p-1 text-center text-[10px] text-muted-foreground"
                >
                  <div className="font-medium text-foreground">
                    {format(day, "dd", { locale: pt })}
                  </div>
                  <div>{format(day, "MMM", { locale: pt })}</div>
                </div>
              ))}
            </div>
          </div>

          {sortedPitches.map((pitch) => {
            const pitchReservations = reservations.filter((r) => r.pitch_code === pitch.code);

            return (
              <div key={pitch.code} className="flex border-b min-h-[40px]">
                <div className="w-16 shrink-0 p-2 text-xs font-semibold border-r flex items-center">
                  {pitch.code}
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-0 flex">
                    {dayColumns.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="flex-1 min-w-[36px] border-r border-muted/50"
                      />
                    ))}
                  </div>

                  {pitchReservations.map((reservation) => (
                    <GanttBar
                      key={reservation.id}
                      reservation={reservation}
                      start={start}
                      days={days}
                      startStr={startStr}
                      endStr={endStr}
                      onExtend={handleExtend}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
