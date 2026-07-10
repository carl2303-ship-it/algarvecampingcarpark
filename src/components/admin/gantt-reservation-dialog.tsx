"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  adminDateLocale,
  adminT,
  formatAdminPaymentStatus,
  formatAdminReservationStatus,
} from "@/lib/admin-i18n";
import type { GanttOccupancyReservation } from "@/lib/gantt-occupancy";

export function GanttReservationDialog({
  reservation,
  open,
  onOpenChange,
}: {
  reservation: GanttOccupancyReservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{reservation.guest_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">{adminT.common.pitch}</span>{" "}
            {reservation.pitch_code ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{adminT.common.phone}</span>{" "}
            {reservation.guest_phone ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{adminT.common.plate}</span>{" "}
            {reservation.vehicle_plate ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{adminT.parkStatus.stay}</span>{" "}
            {format(new Date(reservation.check_in), "dd MMM yyyy", { locale: adminDateLocale })}{" "}
            →{" "}
            {format(new Date(reservation.check_out), "dd MMM yyyy", { locale: adminDateLocale })}
          </p>
          <p>
            <span className="text-muted-foreground">{adminT.common.status}</span>{" "}
            {formatAdminReservationStatus(reservation.status)}
          </p>
          <p>
            <span className="text-muted-foreground">{adminT.common.payment}</span>{" "}
            {formatAdminPaymentStatus(reservation.payment_status)}
          </p>
          <Link
            href={`/admin/reservations/${reservation.id}/edit`}
            className={buttonVariants({ className: "w-full" })}
          >
            {adminT.parkStatus.viewReservation}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GanttZoneWeekDialog({
  zoneName,
  weekLabel,
  reservations,
  open,
  onOpenChange,
  onSelectReservation,
}: {
  zoneName: string;
  weekLabel: string;
  reservations: GanttOccupancyReservation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectReservation: (reservation: GanttOccupancyReservation) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {adminT.timeline.weekReservationsTitle
              .replace("{zone}", zoneName)
              .replace("{week}", weekLabel)}
          </DialogTitle>
        </DialogHeader>

        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{adminT.timeline.weekReservationsEmpty}</p>
        ) : (
          <ul className="max-h-[min(60vh,24rem)] space-y-2 overflow-y-auto">
            {reservations.map((reservation) => (
              <li key={reservation.id}>
                <button
                  type="button"
                  onClick={() => onSelectReservation(reservation)}
                  className="w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <p className="font-medium">{reservation.guest_name}</p>
                  <p className="mt-1 text-muted-foreground">
                    {reservation.pitch_code ?? "—"} ·{" "}
                    {format(new Date(reservation.check_in), "dd MMM", { locale: adminDateLocale })}{" "}
                    →{" "}
                    {format(new Date(reservation.check_out), "dd MMM", { locale: adminDateLocale })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAdminReservationStatus(reservation.status)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
