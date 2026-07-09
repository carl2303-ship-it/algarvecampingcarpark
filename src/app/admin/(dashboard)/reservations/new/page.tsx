import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminReservationForm } from "@/components/admin/admin-reservation-form";
import { buttonVariants } from "@/components/ui/button";
import { getActiveZones } from "@/lib/availability";
import { getPitchMapSpotsAdmin } from "@/lib/pitch-map";
import { cn } from "@/lib/utils";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ pitch?: string }>;
}) {
  const params = await searchParams;
  const [zones, spots] = await Promise.all([getActiveZones(), getPitchMapSpotsAdmin()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/reservations" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Link>
        <h1 className="text-3xl font-bold">Nova reserva</h1>
      </div>
      <AdminReservationForm
        zones={zones}
        spots={spots}
        initialPitchCode={params.pitch?.toUpperCase()}
      />
    </div>
  );
}
