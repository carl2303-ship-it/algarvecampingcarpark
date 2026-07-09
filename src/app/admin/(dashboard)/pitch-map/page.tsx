import { PitchMapEditor } from "@/components/admin/pitch-map-editor";
import { getPitchMapSpotsAdmin } from "@/lib/pitch-map";

export default async function PitchMapAdminPage() {
  const spots = await getPitchMapSpotsAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Mapa de lugares</h1>
        <p className="text-muted-foreground mt-1">
          Posicione cada pastilha na foto aérea. O mapa público na página Localização usa estas coordenadas.
        </p>
      </div>
      <PitchMapEditor initialSpots={spots} />
    </div>
  );
}
