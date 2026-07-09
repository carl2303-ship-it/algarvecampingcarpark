import Link from "next/link";
import { format, startOfToday } from "date-fns";
import { pt } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { OccupancyChart } from "@/components/admin/occupancy-chart";
import {
  getOccupancySeries,
  getUpcomingArrivals,
  getUpcomingDepartures,
  type DashboardReservationRow,
} from "@/lib/admin-dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/pricing";

function ReservationList({ rows }: { rows: DashboardReservationRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">Sem registos</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pitchLabel = row.pitch_code ?? row.pitch?.code ?? "—";
        return (
          <div
            key={row.id}
            className="flex justify-between items-center border-b pb-3 last:border-0 gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{row.guest_name}</p>
              <p className="text-sm text-muted-foreground">
                {row.zone?.name} · Lugar {pitchLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(row.check_in), "dd MMM", { locale: pt })} →{" "}
                {format(new Date(row.check_out), "dd MMM", { locale: pt })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-medium">{formatPrice(row.total_cents)}</p>
              <p className="text-xs text-muted-foreground capitalize">{row.status}</p>
            </div>
          </div>
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

  const totalCapacity = zones?.reduce((s, z) => s + z.capacity, 0) ?? 57;
  const todayOccupancy = occupancy[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/admin/reservations/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Fazer nova reserva
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chegadas hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayArrivals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partidas hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayDepartures ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reservas ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeReservations ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ocupação hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayOccupancy?.percent ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {todayOccupancy?.occupied ?? 0}/{totalCapacity} lugares
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taxa de ocupação (14 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyChart data={occupancy} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Próximas chegadas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationList rows={upcomingArrivals} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas partidas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationList rows={upcomingDepartures} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
