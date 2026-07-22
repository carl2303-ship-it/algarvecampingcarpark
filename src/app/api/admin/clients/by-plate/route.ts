import { NextResponse } from "next/server";
import { lookupVehiclePlate } from "@/lib/vehicle-plate-lookup";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plate = new URL(request.url).searchParams.get("vehicle_plate")?.trim() ?? "";
  const excludeId = new URL(request.url).searchParams.get("exclude_id")?.trim() || null;

  if (!plate) {
    return NextResponse.json({ error: "Immatriculation requise" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const result = await lookupVehiclePlate(supabase, plate, {
      excludeReservationId: excludeId,
    });

    if (!result) {
      return NextResponse.json({ plate: null, guest: null, activeReservation: null });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Plate lookup error:", error);
    const message = error instanceof Error ? error.message : "Erreur lookup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
