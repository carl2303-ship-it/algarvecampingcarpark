import { format, addDays, startOfToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminDateLocale, adminT } from "@/lib/admin-i18n";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CalendarPage() {
  const supabase = createAdminClient();
  const today = startOfToday();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  const startDate = format(today, "yyyy-MM-dd");
  const endDate = format(addDays(today, 14), "yyyy-MM-dd");

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, zone:zones(name, slug)")
    .in("status", ["confirmed", "checked_in", "pending_payment"])
    .lt("check_in", endDate)
    .gt("check_out", startDate);

  function countForDay(zoneId: string, day: Date) {
    const dayStr = format(day, "yyyy-MM-dd");
    return (
      reservations?.filter(
        (r) =>
          r.zone_id === zoneId &&
          r.check_in <= dayStr &&
          r.check_out > dayStr &&
          (r.status !== "pending_payment" || (r.expires_at && r.expires_at > new Date().toISOString()))
      ).length ?? 0
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{adminT.calendar.title}</h1>
      <p className="text-muted-foreground">{adminT.calendar.subtitle}</p>

      <div className="space-y-6">
        {zones?.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{zone.name}</span>
                <Badge variant="outline">
                  {adminT.common.capacity} {zone.capacity}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 md:grid-cols-14 gap-2">
                {days.map((day) => {
                  const count = countForDay(zone.id, day);
                  const pct = (count / zone.capacity) * 100;
                  return (
                    <div
                      key={day.toISOString()}
                      className="text-center p-2 rounded-lg border text-xs"
                      style={{
                        backgroundColor:
                          pct >= 100
                            ? "rgb(254 202 202)"
                            : pct >= 70
                              ? "rgb(254 243 199)"
                              : "rgb(220 252 231)",
                      }}
                    >
                      <p className="font-medium">
                        {format(day, "dd", { locale: adminDateLocale })}
                      </p>
                      <p className="text-muted-foreground">
                        {format(day, "MMM", { locale: adminDateLocale })}
                      </p>
                      <p className="font-bold mt-1">
                        {count}/{zone.capacity}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
