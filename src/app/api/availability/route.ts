import { NextResponse } from "next/server";
import { getZoneAvailability } from "@/lib/availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");

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
    const availability = await getZoneAvailability(checkIn, checkOut);
    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Erro ao verificar disponibilidade" },
      { status: 500 }
    );
  }
}
