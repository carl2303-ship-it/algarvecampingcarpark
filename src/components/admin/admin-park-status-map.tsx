"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  adminDateLocale,
  adminT,
  formatAdminPaymentStatus,
} from "@/lib/admin-i18n";
import {
  PARK_AERIAL_IMAGE,
  PARK_AERIAL_ASPECT_CLASS,
  PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
} from "@/lib/park-pitch-map-defaults";
import type { PitchWithBooking, PitchOperationalStatus } from "@/lib/park-operational";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PitchOperationalStatus, string> = {
  free: "bg-emerald-500/95 text-white border-emerald-300 hover:bg-emerald-600",
  occupied: "bg-red-500/95 text-white border-red-300 hover:bg-red-600",
  checkout_today: "bg-amber-400/95 text-amber-950 border-amber-300 hover:bg-amber-500",
  maintenance: "bg-slate-500/95 text-white border-slate-300",
};

function operationalStatusLabel(status: PitchOperationalStatus): string {
  switch (status) {
    case "free":
      return adminT.parkStatus.stateFree;
    case "occupied":
      return adminT.parkStatus.stateOccupied;
    case "checkout_today":
      return adminT.parkStatus.stateCheckout;
    case "maintenance":
      return adminT.parkStatus.stateMaintenance;
  }
}

function markerClass(status: PitchOperationalStatus, selected: boolean) {
  return cn(
    "absolute -translate-x-1/2 -translate-y-1/2 rounded px-0.5 py-px text-[6px] sm:text-[7px] font-bold leading-none shadow-sm border transition-transform hover:scale-110 hover:z-20 cursor-pointer",
    STATUS_STYLES[status],
    selected && "scale-[1.15] z-30 ring-2 ring-white"
  );
}

export function AdminParkStatusMap({
  pitches,
  checkOutTime,
}: {
  pitches: PitchWithBooking[];
  checkOutTime: string;
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selected = pitches.find((pitch) => pitch.code === selectedCode) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-4 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-emerald-500 border border-emerald-300" />
          {adminT.parkStatus.legendFree}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-red-500 border border-red-300" />
          {adminT.parkStatus.legendOccupied}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-amber-400 border border-amber-300" />
          {adminT.parkStatus.legendCheckout.replace("{time}", checkOutTime)}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-slate-500 border border-slate-300" />
          {adminT.parkStatus.legendMaintenance}
        </span>
      </div>

      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-2xl border shadow-lg bg-muted",
          PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
          PARK_AERIAL_ASPECT_CLASS
        )}
      >
        <Image
          src={PARK_AERIAL_IMAGE}
          alt={adminT.parkStatus.mapAlt}
          fill
          className="object-contain"
          sizes="(max-width: 1400px) 100vw, 1400px"
        />
        <div className="absolute inset-0">
          {pitches.map((pitch) => (
            <button
              key={pitch.code}
              type="button"
              title={pitch.code}
              className={markerClass(pitch.operational_status, selectedCode === pitch.code)}
              style={{ left: `${pitch.x}%`, top: `${pitch.y}%` }}
              onClick={() => setSelectedCode(pitch.code)}
            >
              {pitch.code}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={selectedCode !== null} onOpenChange={(open) => !open && setSelectedCode(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {adminT.parkStatus.pitchTitle.replace("{code}", selected.code)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">{adminT.parkStatus.state}</span>{" "}
                  {operationalStatusLabel(selected.operational_status)}
                </p>
                <p>
                  <span className="text-muted-foreground">{adminT.common.category}</span>{" "}
                  {selected.category ?? "—"} · {selected.max_amperage}A
                </p>

                {selected.reservation ? (
                  <>
                    <p>
                      <span className="text-muted-foreground">{adminT.common.guest}</span>{" "}
                      {selected.reservation.guest_name}
                    </p>
                    <p>
                      <span className="text-muted-foreground">{adminT.common.phone}</span>{" "}
                      {selected.reservation.guest_phone}
                    </p>
                    <p>
                      <span className="text-muted-foreground">{adminT.common.plate}</span>{" "}
                      {selected.reservation.vehicle_plate ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">{adminT.parkStatus.stay}</span>{" "}
                      {format(new Date(selected.reservation.check_in), "dd MMM yyyy", {
                        locale: adminDateLocale,
                      })}{" "}
                      →{" "}
                      {format(new Date(selected.reservation.check_out), "dd MMM yyyy", {
                        locale: adminDateLocale,
                      })}
                    </p>
                    <p>
                      <span className="text-muted-foreground">{adminT.common.payment}</span>{" "}
                      {formatAdminPaymentStatus(selected.reservation.payment_status)}
                    </p>
                    {selected.reservation.operational_notes && (
                      <p className="rounded-lg bg-muted p-3 text-muted-foreground">
                        {selected.reservation.operational_notes}
                      </p>
                    )}
                  </>
                ) : selected.operational_status === "free" ? (
                  <p className="text-muted-foreground">{adminT.parkStatus.availableForCheckIn}</p>
                ) : null}

                <div className="flex gap-2 pt-2">
                  {selected.operational_status === "free" && (
                    <Link
                      href={`/admin/reservations/new?pitch=${selected.code}`}
                      className={buttonVariants({ className: "flex-1" })}
                    >
                      {adminT.parkStatus.newReservation}
                    </Link>
                  )}
                  {selected.reservation && (
                    <Link
                      href={`/admin/reservations/${selected.reservation.id}/edit`}
                      className={buttonVariants({ className: "flex-1" })}
                    >
                      {adminT.parkStatus.viewReservation}
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
