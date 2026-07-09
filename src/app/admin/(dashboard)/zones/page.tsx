import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingManager } from "@/components/admin/pricing-manager";
import { adminT } from "@/lib/admin-i18n";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ZonesPage() {
  const supabase = createAdminClient();

  const [zonesRes, ratesRes, servicesRes] = await Promise.all([
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

      <div className="grid gap-4">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 flex-wrap">
                {zone.name}
                <Badge variant={zone.active ? "default" : "secondary"}>
                  {zone.active ? adminT.common.active : adminT.common.inactive}
                </Badge>
                <Badge variant="outline">
                  {adminT.common.capacity} {zone.capacity}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{zone.description}</p>
              <p className="text-sm">
                {adminT.zones.amenities}{" "}
                {(Array.isArray(zone.amenities) ? zone.amenities : []).join(", ")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <PricingManager
        zones={zones}
        initialRates={ratesRes.data ?? []}
        initialServices={servicesRes.data ?? []}
      />
    </div>
  );
}
