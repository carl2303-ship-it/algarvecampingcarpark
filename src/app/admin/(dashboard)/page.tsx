import Link from "next/link";
import { format, startOfToday } from "date-fns";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { OccupancyChart } from "@/components/admin/occupancy-chart";
import { DashboardReservationList } from "@/components/admin/dashboard-reservation-list";
import { StaffChatPanel } from "@/components/admin/staff-chat-panel";
import { StaffNotepadPanel } from "@/components/admin/staff-notepad-panel";
import {
  getOccupancySeries,
  getOnSiteUnpaidReservations,
  getUpcomingArrivals,
  getUpcomingDepartures,
} from "@/lib/admin-dashboard";
import { adminT } from "@/lib/admin-i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOTAL_CAPACITY } from "@/lib/constants";
import type { Pitch } from "@/types/database";

export default async function AdminDashboard() {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");

  const [
    { count: todayArrivals },
    { count: todayDepartures },
    { count: activeReservations },
    { data: zones },
    { data: pitchesData },
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
    supabase.from("pitches").select("*").order("code"),
    getUpcomingArrivals(),
    getUpcomingDepartures(),
    getOnSiteUnpaidReservations(),
    getOccupancySeries(14),
  ]);

  const pitches = (pitchesData ?? []) as Pitch[];
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
            <DashboardReservationList rows={upcomingArrivals} pitches={pitches} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{adminT.dashboard.upcomingDepartures}</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardReservationList rows={upcomingDepartures} pitches={pitches} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{adminT.dashboard.onSiteUnpaid}</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardReservationList rows={onSiteUnpaid} pitches={pitches} />
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
