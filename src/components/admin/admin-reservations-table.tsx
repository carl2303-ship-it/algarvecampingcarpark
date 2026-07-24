"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  adminT,
  formatAdminPaymentBalanceLabel,
} from "@/lib/admin-i18n";
import {
  getPaymentBalanceTier,
  type PaymentBalanceTier,
} from "@/lib/admin-reservation-payments";
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
  | "vehicle_plate"
  | "total_cents";

type SortDir = "asc" | "desc";

const BALANCE_ROW_STYLES: Record<PaymentBalanceTier, string> = {
  paid: "bg-emerald-50/80 hover:bg-emerald-50",
  partial: "bg-orange-50/80 hover:bg-orange-50",
  unpaid: "bg-red-50/80 hover:bg-red-50",
};

const BALANCE_BADGE_STYLES: Record<PaymentBalanceTier, string> = {
  paid: "border-transparent bg-emerald-600 text-white hover:bg-emerald-600",
  partial: "border-transparent bg-orange-500 text-white hover:bg-orange-500",
  unpaid: "border-transparent bg-red-600 text-white hover:bg-red-600",
};

function paymentTier(row: ReservationRow): PaymentBalanceTier {
  return getPaymentBalanceTier(row.paid_cents ?? 0, row.total_cents);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function matchesNameOrPlate(name: string, plate: string | null | undefined, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qCompact = normalizeSearch(query);
  const nameMatch = name.toLowerCase().includes(q);
  const plateMatch = normalizeSearch(plate ?? "").includes(qCompact);
  return nameMatch || plateMatch;
}

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
      left = formatAdminPaymentBalanceLabel(paymentTier(a)).toLowerCase();
      right = formatAdminPaymentBalanceLabel(paymentTier(b)).toLowerCase();
      break;
    case "pitch":
      left = getPitchCode(a).toLowerCase();
      right = getPitchCode(b).toLowerCase();
      break;
    case "vehicle_plate":
      left = (a.vehicle_plate ?? "").toLowerCase();
      right = (b.vehicle_plate ?? "").toLowerCase();
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
  const [query, setQuery] = useState("");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "check_in" || key === "check_out" ? "desc" : "asc");
  }

  const filtered = useMemo(
    () =>
      reservations.filter((row) =>
        matchesNameOrPlate(row.guest_name, row.vehicle_plate, query)
      ),
    [reservations, query]
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [filtered, sortKey, sortDir]
  );

  const emptyMessage = query.trim()
    ? adminT.reservations.searchNoResults
    : variant === "completed"
      ? adminT.reservations.emptyCompleted
      : adminT.reservations.emptyActive;

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={adminT.reservations.searchPlaceholder}
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label={adminT.reservations.pitch}
                active={sortKey === "pitch"}
                direction={sortDir}
                onClick={() => toggleSort("pitch")}
              />
              <SortableHead
                label={adminT.common.plate}
                active={sortKey === "vehicle_plate"}
                direction={sortDir}
                onClick={() => toggleSort("vehicle_plate")}
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
                label={adminT.reservations.status}
                active={sortKey === "status"}
                direction={sortDir}
                onClick={() => toggleSort("status")}
              />
              <SortableHead
                label={adminT.reservations.zone}
                active={sortKey === "zone"}
                direction={sortDir}
                onClick={() => toggleSort("zone")}
              />
              <SortableHead
                label={adminT.reservations.client}
                active={sortKey === "guest_name"}
                direction={sortDir}
                onClick={() => toggleSort("guest_name")}
              />
              <SortableHead
                label={adminT.reservations.total}
                active={sortKey === "total_cents"}
                direction={sortDir}
                onClick={() => toggleSort("total_cents")}
                className="text-right"
              />
              <TableHead>{adminT.reservations.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => {
                const tier = paymentTier(r);
                return (
                <TableRow key={r.id} className={BALANCE_ROW_STYLES[tier]}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>
                        {getPitchCode(r) || adminT.reservations.pitchUnassigned}
                      </span>
                      {r.electricity_amperage === 10 && (
                        <Badge variant="outline" className="w-fit text-xs py-0 px-1.5">
                          10A ⚡
                        </Badge>
                      )}
                      {r.motorhome_over_9m && (
                        <Badge variant="outline" className="w-fit text-xs py-0 px-1.5">
                          +9 m
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {r.vehicle_plate || "—"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{r.check_in}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{r.check_out}</TableCell>
                  <TableCell>
                    <Badge className={BALANCE_BADGE_STYLES[tier]}>
                      {formatAdminPaymentBalanceLabel(tier)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getZoneName(r) || "—"}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground">{r.guest_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(r.total_cents)}</TableCell>
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
                          {(r.status === "confirmed" || r.status === "checked_in") && (
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
              );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
