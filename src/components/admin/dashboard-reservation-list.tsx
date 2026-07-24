"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CheckInDialog } from "@/components/admin/check-in-dialog";
import { CheckOutButton } from "@/components/admin/check-out-button";
import {
  adminDateLocale,
  adminT,
  formatAdminPaymentBalanceLabel,
} from "@/lib/admin-i18n";
import type { DashboardReservationRow } from "@/lib/admin-dashboard";
import {
  getPaymentBalanceTier,
  type PaymentBalanceTier,
} from "@/lib/admin-reservation-payments";
import { formatPrice } from "@/lib/pricing";
import type { Pitch, Reservation } from "@/types/database";
import { cn } from "@/lib/utils";

const BALANCE_CARD_STYLES: Record<PaymentBalanceTier, string> = {
  paid: "bg-emerald-50 border-emerald-200",
  partial: "bg-orange-50 border-orange-200",
  unpaid: "bg-red-50 border-red-200",
};

const BALANCE_LABEL_STYLES: Record<PaymentBalanceTier, string> = {
  paid: "text-emerald-800",
  partial: "text-orange-800",
  unpaid: "text-red-800",
};

function toCheckInReservation(row: DashboardReservationRow): Reservation {
  return {
    id: row.id,
    zone_id: row.zone_id,
    pitch_id: row.pitch_id,
    check_in: row.check_in,
    check_out: row.check_out,
    status: row.status as Reservation["status"],
    guest_name: row.guest_name,
    guest_email: "",
    guest_phone: "",
    vehicle_plate: row.vehicle_plate,
    num_guests: 1,
    notes: null,
    total_cents: row.total_cents,
    paid_cents: row.paid_cents,
    pitch_code: row.pitch_code,
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    expires_at: null,
    checked_in_at: null,
    checked_out_at: null,
    created_at: "",
    updated_at: "",
  };
}

export function DashboardReservationList({
  rows,
  pitches,
}: {
  rows: DashboardReservationRow[];
  pitches: Pitch[];
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">{adminT.dashboard.noRecords}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pitchLabel = row.pitch_code ?? row.pitch?.code ?? "—";
        const paidCents = row.paid_cents ?? 0;
        const dueCents = Math.max(0, row.total_cents - paidCents);
        const tier = getPaymentBalanceTier(paidCents, row.total_cents);
        const turnoverUrgent = row.turnover_urgent;
        const canArrive = row.status === "confirmed";
        const canDepart = row.status === "confirmed" || row.status === "checked_in";

        return (
          <div
            key={row.id}
            className={cn(
              "rounded-lg border p-3 space-y-3",
              turnoverUrgent
                ? "bg-fuchsia-100 border-fuchsia-300"
                : BALANCE_CARD_STYLES[tier]
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-12 min-w-12 shrink-0 items-center justify-center rounded-lg px-2.5 text-lg font-bold tracking-tight text-white shadow-sm",
                  turnoverUrgent ? "bg-fuchsia-600" : "bg-slate-900"
                )}
                aria-label={pitchLabel}
              >
                {pitchLabel}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/reservations/${row.id}/edit`}
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {row.vehicle_plate ? (
                    <>
                      <span className="font-bold tracking-wide text-foreground">
                        {row.vehicle_plate}
                      </span>
                      <span className="ml-2 font-medium text-primary">{row.guest_name}</span>
                    </>
                  ) : (
                    row.guest_name
                  )}
                </Link>
                {row.zone?.name ? (
                  <p className="text-sm text-muted-foreground truncate">{row.zone.name}</p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {format(new Date(row.check_in), "dd MMM", { locale: adminDateLocale })} →{" "}
                  {format(new Date(row.check_out), "dd MMM", { locale: adminDateLocale })}
                </p>
                {turnoverUrgent ? (
                  <p className="text-xs font-semibold text-fuchsia-800 mt-0.5">
                    {adminT.dashboard.turnoverUrgent}
                  </p>
                ) : null}
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-xs text-muted-foreground">{adminT.dashboard.totalAmount}</p>
                <p className="font-medium leading-tight">{formatPrice(row.total_cents)}</p>
                <p className="text-xs text-muted-foreground pt-1">{adminT.dashboard.balanceDue}</p>
                <p
                  className={cn(
                    "font-semibold leading-tight",
                    turnoverUrgent ? "text-fuchsia-800" : BALANCE_LABEL_STYLES[tier]
                  )}
                >
                  {formatPrice(dueCents)}
                </p>
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    turnoverUrgent ? "text-fuchsia-800" : BALANCE_LABEL_STYLES[tier]
                  )}
                >
                  {formatAdminPaymentBalanceLabel(tier)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              {canArrive ? (
                <CheckInDialog reservation={toCheckInReservation(row)} pitches={pitches} />
              ) : null}
              {canDepart ? (
                <CheckOutButton
                  reservationId={row.id}
                  pitchId={row.pitch_id}
                  pitchCode={row.pitch_code ?? row.pitch?.code ?? null}
                  redirectTo="/admin"
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
