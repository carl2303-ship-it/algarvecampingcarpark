import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ pitch_id: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = schema.parse(await request.json());
  const supabase = createAdminClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (!reservation || reservation.status !== "confirmed") {
    return NextResponse.json({ error: "Reserva inválida" }, { status: 400 });
  }

  const { data: pitch } = await supabase
    .from("pitches")
    .select("*")
    .eq("id", body.pitch_id)
    .eq("zone_id", reservation.zone_id)
    .single();

  if (!pitch) {
    return NextResponse.json({ error: "Lugar indisponível" }, { status: 409 });
  }

  const alreadyAssigned = reservation.pitch_id === body.pitch_id;
  if (!alreadyAssigned && pitch.status !== "available") {
    return NextResponse.json({ error: "Lugar indisponível" }, { status: 409 });
  }

  await supabase
    .from("reservations")
    .update({
      status: "checked_in",
      pitch_id: body.pitch_id,
      pitch_code: pitch.code,
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase
    .from("pitches")
    .update({ status: "occupied" })
    .eq("id", body.pitch_id);

  return NextResponse.json({ success: true });
}
