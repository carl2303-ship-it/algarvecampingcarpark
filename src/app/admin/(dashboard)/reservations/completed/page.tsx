import { Download } from "lucide-react";
import { AdminReservationsTable } from "@/components/admin/admin-reservations-table";
import { buttonVariants } from "@/components/ui/button";
import { adminT } from "@/lib/admin-i18n";
import { COMPLETED_RESERVATION_STATUSES } from "@/lib/admin-reservation-status";
import { runAutoCheckout } from "@/lib/reservation-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pitch, Reservation } from "@/types/database";

export default async function CompletedReservationsPage() {
  // Ensure overdue actives are moved here before listing.
  await runAutoCheckout();

  const supabase = createAdminClient();

  const [{ data: reservations }, { data: pitches }] = await Promise.all([
    supabase
      .from("reservations")
      .select("*, zone:zones(name), pitch:pitches(code)")
      .in("status", [...COMPLETED_RESERVATION_STATUSES])
      .order("check_out", { ascending: false })
      .limit(200),
    supabase.from("pitches").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">{adminT.reservations.titleCompleted}</h1>
        <a href="/api/admin/export" className={buttonVariants({ variant: "outline" })}>
          <Download className="mr-2 h-4 w-4" />
          {adminT.reservations.exportCsv}
        </a>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">{adminT.reservations.completedHint}</p>

      <AdminReservationsTable
        reservations={(reservations as Reservation[]) ?? []}
        pitches={(pitches as Pitch[]) ?? []}
        variant="completed"
      />
    </div>
  );
}
