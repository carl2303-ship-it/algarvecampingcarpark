import { NextResponse } from "next/server";
import { getZoneAvailability } from "@/lib/availability";
import { getParkSettings, isOnlineBookingOpen } from "@/lib/park-settings";

function isGateEntryRequest(searchParams: URLSearchParams): boolean {
  return searchParams.get("gate_entry") === "1";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gateEntry = isGateEntryRequest(searchParams);
  const parkSettings = await getParkSettings();

  if (!isOnlineBookingOpen(parkSettings) && !gateEntry) {
    return NextResponse.json(
      { error: "As reservas online estão temporariamente indisponíveis." },
      { status: 503 }
    );
  }

  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");
  const numGuests = Math.min(
    10,
    Math.max(1, parseInt(searchParams.get("num_guests") ?? "2", 10) || 2)
  );

  if (!checkIn || !checkOut) {
    return NextResponse.json(
      { error: "check_in e check_out são obrigatórios" },
      { status: 400 }
    );
  }

  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "Check-out deve ser posterior ao check-in" },
      { status: 400 }
    );
  }

  try {
    const availability = await getZoneAvailability(checkIn, checkOut, numGuests);
    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Erro ao verificar disponibilidade" },
      { status: 500 }
    );
  }
}
