"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckInDialog } from "@/components/admin/check-in-dialog";
import { CheckOutButton } from "@/components/admin/check-out-button";
import { DeleteReservationButton } from "@/components/admin/delete-reservation-button";
import { adminT, formatAdminReservationStatus } from "@/lib/admin-i18n";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Pitch, Reservation } from "@/types/database";

type ReservationRow = Reservation & {
  zone?: { name: string } | null;
  pitch?: { code: string } | null;
};

type SortKey =
  | "guest_name"
  | "zone"
  | "check_in"
  | "check_out"
  | "status"
  | "pitch"
  | "total_cents";

type SortDir = "asc" | "desc";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "outline",
  confirmed: "default",
  checked_in: "secondary",
  checked_out: "outline",
  cancelled: "destructive",
  expired: "destructive",
};

function getZoneName(row: ReservationRow) {
  return row.zone?.name ?? "";
}

function getPitchCode(row: ReservationRow) {
  return row.pitch_code ?? row.pitch?.code ?? "";
}

function compareRows(a: ReservationRow, b: ReservationRow, key: SortKey, dir: SortDir) {
  let left: string | number = "";
  let right: string | number = "";

  switch (key) {
    case "guest_name":
      left = a.guest_name.toLowerCase();
      right = b.guest_name.toLowerCase();
      break;
    case "zone":
      left = getZoneName(a).toLowerCase();
      right = getZoneName(b).toLowerCase();
      break;
    case "check_in":
      left = a.check_in;
      right = b.check_in;
      break;
    case "check_out":
      left = a.check_out;
      right = b.check_out;
      break;
    case "status":
      left = formatAdminReservationStatus(a.status).toLowerCase();
      right = formatAdminReservationStatus(b.status).toLowerCase();
      break;
    case "pitch":
      left = getPitchCode(a).toLowerCase();
      right = getPitchCode(b).toLowerCase();
      break;
    case "total_cents":
      left = a.total_cents;
      right = b.total_cents;
      break;
  }

  let result = 0;
  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), "fr", { numeric: true, sensitivity: "base" });
  }

  return dir === "asc" ? result : -result;
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  direction: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded"
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "text-foreground" : "text-muted-foreground")} />
      </button>
    </TableHead>
  );
}

export function AdminReservationsTable({
  reservations,
  pitches,
  variant = "active",
}: {
  reservations: ReservationRow[];
  pitches: Pitch[];
  variant?: "active" | "completed";
}) {
  const [sortKey, setSortKey] = useState<SortKey>("check_in");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "check_in" || key === "check_out" ? "desc" : "asc");
  }

  const sorted = useMemo(
    () => [...reservations].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [reservations, sortKey, sortDir]
  );

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              label={adminT.reservations.client}
              active={sortKey === "guest_name"}
              direction={sortDir}
              onClick={() => toggleSort("guest_name")}
            />
            <SortableHead
              label={adminT.reservations.zone}
              active={sortKey === "zone"}
              direction={sortDir}
              onClick={() => toggleSort("zone")}
            />
            <SortableHead
              label={adminT.reservations.checkIn}
              active={sortKey === "check_in"}
              direction={sortDir}
              onClick={() => toggleSort("check_in")}
            />
            <SortableHead
              label={adminT.reservations.checkOut}
              active={sortKey === "check_out"}
              direction={sortDir}
              onClick={() => toggleSort("check_out")}
            />
            <SortableHead
              label={adminT.reservations.total}
              active={sortKey === "total_cents"}
              direction={sortDir}
              onClick={() => toggleSort("total_cents")}
              className="text-right"
            />
            <SortableHead
              label={adminT.reservations.status}
              active={sortKey === "status"}
              direction={sortDir}
              onClick={() => toggleSort("status")}
            />
            <SortableHead
              label={adminT.reservations.pitch}
              active={sortKey === "pitch"}
              direction={sortDir}
              onClick={() => toggleSort("pitch")}
            />
            <TableHead>{adminT.reservations.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                {variant === "completed"
                  ? adminT.reservations.emptyCompleted
                  : adminT.reservations.emptyActive}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.guest_email}</p>
                  </div>
                </TableCell>
                <TableCell>{getZoneName(r) || "—"}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{r.check_in}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{r.check_out}</TableCell>
                <TableCell className="text-right">{formatPrice(r.total_cents)}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[r.status] ?? "outline"}>
                    {formatAdminReservationStatus(r.status)}
                  </Badge>
                </TableCell>
                <TableCell>{getPitchCode(r) || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {variant === "active" && (
                      <>
                        <Link
                          href={`/admin/reservations/${r.id}/edit`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          {adminT.reservations.edit}
                        </Link>
                        {r.status === "confirmed" && (
                          <CheckInDialog reservation={r} pitches={pitches} />
                        )}
                        {r.status === "checked_in" && (
                          <CheckOutButton
                            reservationId={r.id}
                            pitchId={r.pitch_id}
                            pitchCode={r.pitch_code ?? null}
                          />
                        )}
                      </>
                    )}
                    {variant === "completed" && r.status === "checked_out" && (
                      <Link
                        href={`/admin/reservations/${r.id}/edit`}
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        {adminT.reservations.edit}
                      </Link>
                    )}
                    <DeleteReservationButton reservationId={r.id} guestName={r.guest_name} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
