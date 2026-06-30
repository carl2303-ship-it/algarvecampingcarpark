import { format, startOfToday, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/pricing";

export default async function AdminDashboard() {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfToday(), 7), "yyyy-MM-dd");

  const [
    { count: todayArrivals },
    { count: todayDepartures },
    { count: activeReservations },
    { data: recentReservations },
    { data: zones },
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
    supabase
      .from("reservations")
      .select("*, zone:zones(name)")
      .in("status", ["confirmed", "checked_in", "pending_payment"])
      .gte("check_in", today)
      .lte("check_in", weekEnd)
      .order("check_in")
      .limit(10),
    supabase.from("zones").select("*").eq("active", true),
  ]);

  const totalCapacity = zones?.reduce((s, z) => s + z.capacity, 0) ?? 57;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chegadas hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayArrivals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Partidas hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayDepartures ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservas ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeReservations ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capacidade total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCapacity}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas chegadas (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReservations?.length === 0 ? (
            <p className="text-muted-foreground">Sem chegadas previstas</p>
          ) : (
            <div className="space-y-3">
              {recentReservations?.map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{r.guest_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(r.zone as { name: string } | null)?.name} ·{" "}
                      {format(new Date(r.check_in), "dd MMM", { locale: pt })} →{" "}
                      {format(new Date(r.check_out), "dd MMM", { locale: pt })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(r.total_cents)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
