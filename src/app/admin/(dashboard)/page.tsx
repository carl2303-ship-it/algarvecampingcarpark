import Link from "next/link";
import { format, startOfToday } from "date-fns";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { OccupancyChart } from "@/components/admin/occupancy-chart";
import { StaffChatPanel } from "@/components/admin/staff-chat-panel";
import { StaffNotepadPanel } from "@/components/admin/staff-notepad-panel";
import {
  getOccupancySeries,
  getOnSiteUnpaidReservations,
  getUpcomingArrivals,
  getUpcomingDepartures,
  type DashboardReservationRow,
} from "@/lib/admin-dashboard";
import {
  adminDateLocale,
  adminT,
  formatAdminPaymentBalanceLabel,
} from "@/lib/admin-i18n";
import {
  getPaymentBalanceTier,
  type PaymentBalanceTier,
} from "@/lib/admin-reservation-payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/pricing";
import { TOTAL_CAPACITY } from "@/lib/constants";
import { cn } from "@/lib/utils";

const BALANCE_CARD_STYLES: Record<PaymentBalanceTier, string> = {
  paid: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/80",
  partial: "bg-orange-50 border-orange-200 hover:bg-orange-100/80",
  unpaid: "bg-red-50 border-red-200 hover:bg-red-100/80",
};

const BALANCE_LABEL_STYLES: Record<PaymentBalanceTier, string> = {
  paid: "text-emerald-800",
  partial: "text-orange-800",
  unpaid: "text-red-800",
};

function ReservationList({ rows }: { rows: DashboardReservationRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">{adminT.dashboard.noRecords}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pitchLabel = row.pitch_code ?? row.pitch?.code ?? "—";
        const tier = getPaymentBalanceTier(row.paid_cents ?? 0, row.total_cents);
        const turnoverUrgent = row.turnover_urgent;
        return (
          <Link
            key={row.id}
            href={`/admin/reservations/${row.id}/edit`}
            className={cn(
              "flex items-center border rounded-lg p-3 gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              turnoverUrgent
                ? "bg-fuchsia-100 border-fuchsia-300 hover:bg-fuchsia-200/80"
                : BALANCE_CARD_STYLES[tier]
            )}
          >
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
              <p className="font-medium truncate text-primary hover:underline">
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
              </p>
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
            <div className="text-right shrink-0">
              <p className="font-medium">{formatPrice(row.total_cents)}</p>
              <p
                className={cn(
                  "text-xs font-medium",
                  turnoverUrgent ? "text-fuchsia-800" : BALANCE_LABEL_STYLES[tier]
                )}
              >
                {formatAdminPaymentBalanceLabel(tier)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function AdminDashboard() {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");

  const [
    { count: todayArrivals },
    { count: todayDepartures },
    { count: activeReservations },
    { data: zones },
    upcomingArrivals,
    upcomingDepartures,
    onSiteUnpaid,
    occupancy,
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("check_in", today)
      .in("status", ["confirmed", "checked_in"]),
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("check_out", today)
      .in("status", ["checked_in", "confirmed"]),
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "checked_in"]),
    supabase.from("zones").select("*").eq("active", true),
    getUpcomingArrivals(),
    getUpcomingDepartures(),
    getOnSiteUnpaidReservations(),
    getOccupancySeries(14),
  ]);

  const totalCapacity = zones?.reduce((s, z) => s + z.capacity, 0) ?? TOTAL_CAPACITY;
  const todayOccupancy = occupancy[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">{adminT.dashboard.title}</h1>
        <Link href="/admin/reservations/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          {adminT.dashboard.newReservation}
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {adminT.dashboard.arrivalsToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayArrivals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {adminT.dashboard.departuresToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayDepartures ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {adminT.dashboard.activeReservations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeReservations ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {adminT.dashboard.occupancyToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayOccupancy?.percent ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {adminT.dashboard.pitchesCount
                .replace("{occupied}", String(todayOccupancy?.occupied ?? 0))
                .replace("{capacity}", String(totalCapacity))}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{adminT.dashboard.upcomingArrivals}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationList rows={upcomingArrivals} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{adminT.dashboard.upcomingDepartures}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationList rows={upcomingDepartures} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{adminT.dashboard.onSiteUnpaid}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationList rows={onSiteUnpaid} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{adminT.dashboard.occupancyRate14}</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyChart data={occupancy} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <StaffChatPanel />
        <StaffNotepadPanel />
      </div>
    </div>
  );
}
