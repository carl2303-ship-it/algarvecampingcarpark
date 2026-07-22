import { NextResponse } from "next/server";
import { lookupVehiclePlate } from "@/lib/vehicle-plate-lookup";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Public plate lookup for autofill + active-reservation guard. */
export async function GET(request: Request) {
  const plate = new URL(request.url).searchParams.get("vehicle_plate")?.trim() ?? "";
  if (!plate || plate.length < 3) {
    return NextResponse.json({ found: false });
  }

  try {
    const supabase = createAdminClient();
    const result = await lookupVehiclePlate(supabase, plate);

    if (!result) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: Boolean(result.guest) || Boolean(result.activeReservation),
      plate: result.plate,
      guest: result.guest
        ? {
            name: result.guest.name,
            email: result.guest.email,
            phone: result.guest.phone,
            country: result.guest.country,
          }
        : null,
      activeReservation: result.activeReservation
        ? {
            check_in: result.activeReservation.check_in,
            check_out: result.activeReservation.check_out,
            pitch_code: result.activeReservation.pitch_code,
          }
        : null,
    });
  } catch (error) {
    console.error("Public plate lookup error:", error);
    return NextResponse.json({ found: false });
  }
}
