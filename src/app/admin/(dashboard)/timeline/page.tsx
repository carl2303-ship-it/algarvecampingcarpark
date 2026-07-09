import { addDays, format, startOfToday } from "date-fns";
import { AdminGanttChart } from "@/components/admin/admin-gantt-chart";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPitchMapSpots } from "@/lib/pitch-map";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const supabase = createAdminClient();
  const today = format(startOfToday(), "yyyy-MM-dd");
  const horizon = format(addDays(startOfToday(), 21), "yyyy-MM-dd");

  const [spots, { data: reservations }] = await Promise.all([
    getPitchMapSpots(),
    supabase
      .from("reservations")
      .select("id, pitch_code, guest_name, check_in, check_out, status")
      .not("pitch_code", "is", null)
      .in("status", ["confirmed", "checked_in"])
      .lt("check_in", horizon)
      .gt("check_out", today)
      .order("check_in"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendário Gantt</h1>
        <p className="text-muted-foreground mt-1">
          Arraste a ponta direita de cada barra para prolongar a estadia. O valor extra é calculado
          automaticamente e enviado por email com link Stripe.
        </p>
      </div>

      <AdminGanttChart
        pitches={spots.map((spot) => ({ code: spot.code }))}
        reservations={(reservations ?? []) as Parameters<typeof AdminGanttChart>[0]["reservations"]}
        days={21}
      />
    </div>
  );
}
