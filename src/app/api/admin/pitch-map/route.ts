import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { getPitchMapSpotsAdmin } from "@/lib/pitch-map";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const spots = await getPitchMapSpotsAdmin();
    return NextResponse.json({ spots });
  } catch (error) {
    console.error("Pitch map list error:", error);
    return NextResponse.json({ error: "Erro ao carregar mapa" }, { status: 500 });
  }
}

const spotSchema = z.object({
  code: z.string().min(1).max(10),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  panoramic: z.boolean(),
  electric: z.boolean(),
  sort_order: z.number().int().optional(),
});

const saveSchema = z.object({
  spots: z.array(spotSchema).min(1),
});

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { spots } = saveSchema.parse(await request.json());
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const rows = spots.map((spot, index) => ({
      code: spot.code,
      x: Number(spot.x.toFixed(2)),
      y: Number(spot.y.toFixed(2)),
      panoramic: spot.panoramic,
      electric: spot.electric,
      sort_order: spot.sort_order ?? index + 1,
    }));

    const { error } = await supabase.from("pitch_map_spots").upsert(rows, { onConflict: "code" });
    if (error) {
      console.error("Pitch map save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Pitch map save unexpected error:", error);
    return NextResponse.json({ error: "Erro ao guardar mapa" }, { status: 500 });
  }
}
