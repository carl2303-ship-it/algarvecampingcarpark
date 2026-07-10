import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { AdminReservationsTable } from "@/components/admin/admin-reservations-table";
import { buttonVariants } from "@/components/ui/button";
import { adminT } from "@/lib/admin-i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pitch, Reservation } from "@/types/database";

export default async function ReservationsPage() {
  const supabase = createAdminClient();

  const [{ data: reservations }, { data: pitches }] = await Promise.all([
    supabase
      .from("reservations")
      .select("*, zone:zones(name), pitch:pitches(code)")
      .order("check_in", { ascending: false })
      .limit(200),
    supabase.from("pitches").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">{adminT.reservations.title}</h1>
        <div className="flex gap-2">
          <Link href="/admin/reservations/new" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            {adminT.reservations.newReservation}
          </Link>
          <a href="/api/admin/export" className={buttonVariants({ variant: "outline" })}>
            <Download className="mr-2 h-4 w-4" />
            {adminT.reservations.exportCsv}
          </a>
        </div>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">{adminT.reservations.sortHint}</p>

      <AdminReservationsTable
        reservations={(reservations as Reservation[]) ?? []}
        pitches={(pitches as Pitch[]) ?? []}
      />
    </div>
  );
}
