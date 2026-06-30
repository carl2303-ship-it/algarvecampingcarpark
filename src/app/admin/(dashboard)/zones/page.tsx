import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/pricing";

export default async function ZonesPage() {
  const supabase = createAdminClient();

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .order("sort_order");

  const { data: rates } = await supabase
    .from("zone_rates")
    .select("*, zone:zones(name)")
    .order("start_date");

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Zonas & Tarifas</h1>

      <div className="grid gap-4">
        {zones?.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
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

      <Card>
        <CardHeader>
          <CardTitle>Tarifas Sazonais</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Preço/noite</TableHead>
                <TableHead>Mín. noites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates?.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    {(rate.zone as { name: string } | null)?.name}
                  </TableCell>
                  <TableCell>{rate.start_date}</TableCell>
                  <TableCell>{rate.end_date}</TableCell>
                  <TableCell>{formatPrice(rate.price_cents_per_night)}</TableCell>
                  <TableCell>{rate.min_nights}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
