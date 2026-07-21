import { PricingManager } from "@/components/admin/pricing-manager";
import { PricingSupplementsManager } from "@/components/admin/pricing-supplements-manager";
import { ZonesManager } from "@/components/admin/zones-manager";
import { adminT } from "@/lib/admin-i18n";
import { getPricingSupplements, type PricingSupplement } from "@/lib/pricing-supplements";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ZonesPage() {
  const supabase = createAdminClient();

  const [supplementsRes, zonesRes, ratesRes, servicesRes] = await Promise.all([
    supabase.from("pricing_supplements").select("*").order("sort_order"),
    supabase.from("zones").select("*").order("sort_order"),
    supabase.from("zone_rates").select("*, zone:zones(name)").order("start_date"),
    supabase.from("service_items").select("*").order("sort_order"),
  ]);

  const zones = (zonesRes.data ?? []).map((z) => ({
    ...z,
    amenities: Array.isArray(z.amenities) ? z.amenities : [],
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{adminT.zones.title}</h1>
        <p className="text-muted-foreground mt-1">{adminT.zones.description}</p>
      </div>

      <ZonesManager initialZones={zones} />

      <PricingSupplementsManager initialSupplements={supplementsRes.data ?? []} />

      <PricingManager
        zones={zones}
        initialRates={ratesRes.data ?? []}
        initialServices={servicesRes.data ?? []}
      />
    </div>
  );
}
