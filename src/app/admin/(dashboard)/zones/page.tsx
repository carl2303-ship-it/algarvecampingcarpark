import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingManager } from "@/components/admin/pricing-manager";
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
        <h1 className="text-3xl font-bold">Zonas & Tarifas</h1>
        <p className="text-muted-foreground mt-1">
          Gerir preços e serviços — sincronizado com o preçário público e reservas online.
        </p>
      </div>

      <div className="grid gap-4">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 flex-wrap">
                {zone.name}
                <Badge variant={zone.active ? "default" : "secondary"}>
                  {zone.active ? "Ativa" : "Inativa"}
                </Badge>
                <Badge variant="outline">Cap. {zone.capacity}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{zone.description}</p>
              <p className="text-sm">
                Amenities:{" "}
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
