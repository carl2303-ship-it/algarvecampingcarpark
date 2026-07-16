import { NextResponse } from "next/server";
import { z } from "zod";
import { getReservationForStay, quoteStayExtension } from "@/lib/stay-extension";
import { verifyStayToken } from "@/lib/stay-token";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  token: z.string().min(10),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      token: searchParams.get("token"),
      check_out: searchParams.get("check_out"),
    });

    const payload = verifyStayToken(parsed.token);
    if (!payload) {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 401 });
    }

    const reservation = await getReservationForStay(payload.reservationId);
    if (!reservation) {
      return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    }

    const quote = await quoteStayExtension({
      reservation: {
        id: reservation.id,
        status: reservation.status,
        zone_id: reservation.zone_id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        total_cents: reservation.total_cents,
        num_guests: reservation.num_guests,
        pitch_code: reservation.pitch_code,
      },
      newCheckOut: parsed.check_out,
    });

    if (!quote.available) {
      return NextResponse.json(
        {
          error: quote.error ?? "Não é possível prolongar",
          conflict: quote.conflict,
        },
        { status: quote.conflict ? 409 : 400 }
      );
    }

    return NextResponse.json({
      available: true,
      old_check_out: quote.oldCheckOut,
      new_check_out: quote.newCheckOut,
      old_total_cents: quote.oldTotalCents,
      new_total_cents: quote.newTotalCents,
      extension_cents: quote.extensionCents,
      nights_added: quote.nightsAdded,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }
    console.error("Stay quote error:", error);
    return NextResponse.json({ error: "Erro ao calcular extensão" }, { status: 500 });
  }
}
