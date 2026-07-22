import { NextResponse } from "next/server";
import { z } from "zod";
import { listGuests, syncGuestsFromReservations } from "@/lib/admin-guests";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.string().uuid(),
  is_habitual: z.boolean(),
});

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = createAdminClient();
    await syncGuestsFromReservations(supabase);
    const guests = await listGuests(supabase);
    return NextResponse.json({ guests });
  } catch (error) {
    console.error("Admin clients GET error:", error);
    const message = error instanceof Error ? error.message : "Erreur clients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .update({ is_habitual: parsed.data.is_habitual })
    .eq("id", parsed.data.id)
    .select("id, is_habitual")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  return NextResponse.json({ guest: data });
}
