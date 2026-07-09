import { AdminParkStatusMap } from "@/components/admin/admin-park-status-map";
import { getPitchesWithOperationalStatus } from "@/lib/park-operational";
import { getParkSettings } from "@/lib/park-settings";

export const dynamic = "force-dynamic";

export default async function ParkStatusPage() {
  const [pitches, parkSettings] = await Promise.all([
    getPitchesWithOperationalStatus(),
    getParkSettings(),
  ]);

  const occupied = pitches.filter((p) => p.operational_status === "occupied").length;
  const checkout = pitches.filter((p) => p.operational_status === "checkout_today").length;
  const free = pitches.filter((p) => p.operational_status === "free").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mapa operacional</h1>
        <p className="text-muted-foreground mt-1">
          Vista em tempo real dos lugares — substitui as anotações no Excel.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-medium">
          {free} livres
        </span>
        <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 font-medium">
          {occupied} ocupados
        </span>
        <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-1 font-medium">
          {checkout} check-out hoje
        </span>
      </div>

      <AdminParkStatusMap pitches={pitches} checkOutTime={parkSettings.check_out_time} />
    </div>
  );
}
