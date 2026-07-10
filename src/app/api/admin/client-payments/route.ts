import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientPaymentHistory } from "@/lib/admin-reservation-payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehiclePlate = new URL(request.url).searchParams.get("vehicle_plate")?.trim();
  if (!vehiclePlate) {
    return NextResponse.json({ error: "Matricule requis." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const payments = await getClientPaymentHistory(supabase, vehiclePlate);
    return NextResponse.json({ payments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors du chargement des paiements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
