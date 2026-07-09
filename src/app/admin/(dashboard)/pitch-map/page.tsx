import { PitchMapEditor } from "@/components/admin/pitch-map-editor";
import { adminT } from "@/lib/admin-i18n";
import { getPitchMapSpotsAdmin } from "@/lib/pitch-map";

export default async function PitchMapAdminPage() {
  const spots = await getPitchMapSpotsAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{adminT.pitchMap.pageTitle}</h1>
        <p className="text-muted-foreground mt-1">{adminT.pitchMap.pageDescription}</p>
      </div>
      <PitchMapEditor initialSpots={spots} />
    </div>
  );
}
