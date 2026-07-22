import { AdminClientsTable } from "@/components/admin/admin-clients-table";
import { adminT } from "@/lib/admin-i18n";
import { listGuests, syncGuestsFromReservations } from "@/lib/admin-guests";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = createAdminClient();
  await syncGuestsFromReservations(supabase);
  const guests = await listGuests(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{adminT.clients.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{adminT.clients.subtitle}</p>
      </div>

      <AdminClientsTable initialGuests={guests} />
    </div>
  );
}
