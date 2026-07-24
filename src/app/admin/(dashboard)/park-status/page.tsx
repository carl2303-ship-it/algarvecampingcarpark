import { AdminParkStatusMap } from "@/components/admin/admin-park-status-map";
import { adminT } from "@/lib/admin-i18n";
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
  const unpaid = pitches.filter((p) => p.operational_status === "unpaid").length;
  const free = pitches.filter((p) => p.operational_status === "free").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{adminT.parkStatus.title}</h1>
        <p className="text-muted-foreground mt-1">{adminT.parkStatus.description}</p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-medium">
          {adminT.parkStatus.freeCount.replace("{count}", String(free))}
        </span>
        <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 font-medium">
          {adminT.parkStatus.occupiedCount.replace("{count}", String(occupied))}
        </span>
        <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-1 font-medium">
          {adminT.parkStatus.checkoutTodayCount.replace("{count}", String(checkout))}
        </span>
        <span className="rounded-full bg-fuchsia-100 text-fuchsia-900 px-3 py-1 font-medium">
          {adminT.parkStatus.unpaidCount.replace("{count}", String(unpaid))}
        </span>
      </div>

      <AdminParkStatusMap pitches={pitches} checkOutTime={parkSettings.check_out_time} />
    </div>
  );
}
