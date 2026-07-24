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
        return (
          <Link
            key={row.id}
            href={`/admin/reservations/${row.id}/edit`}
            className={cn(
              "flex justify-between items-center border rounded-lg p-3 gap-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              BALANCE_CARD_STYLES[tier]
            )}
          >
            <div className="min-w-0">
              <p className="font-medium truncate text-primary hover:underline">{row.guest_name}</p>
              <p className="text-sm text-muted-foreground">
                {row.zone?.name} · {adminT.dashboard.pitchLabel.replace("{code}", pitchLabel)}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(row.check_in), "dd MMM", { locale: adminDateLocale })} →{" "}
                {format(new Date(row.check_out), "dd MMM", { locale: adminDateLocale })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-medium">{formatPrice(row.total_cents)}</p>
              <p className={cn("text-xs font-medium", BALANCE_LABEL_STYLES[tier])}>
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

      <div className="grid lg:grid-cols-2 gap-6">
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
