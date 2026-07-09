import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { getPitchMapSpotsAdmin } from "@/lib/pitch-map";
import { getSpotZoneSlug, ZONE_SLUGS } from "@/lib/park-pitch-map-defaults";

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
  image_url: z.string().nullable().optional(),
  width_m: z.number().positive().nullable().optional(),
  length_m: z.number().positive().nullable().optional(),
  zone_slug: z.enum(ZONE_SLUGS).nullable().optional(),
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

    const rows = spots.map((spot, index) => {
      const zone_slug =
        spot.zone_slug ?? getSpotZoneSlug({ panoramic: spot.panoramic, electric: spot.electric });
      return {
        code: spot.code,
        x: Number(spot.x.toFixed(2)),
        y: Number(spot.y.toFixed(2)),
        panoramic: spot.panoramic,
        electric: spot.electric,
        sort_order: spot.sort_order ?? index + 1,
        image_url: spot.image_url ?? null,
        width_m: spot.width_m != null ? Number(spot.width_m.toFixed(2)) : null,
        length_m: spot.length_m != null ? Number(spot.length_m.toFixed(2)) : null,
        zone_slug,
      };
    });

    const { error } = await supabase.from("pitch_map_spots").upsert(rows, { onConflict: "code" });
    if (error) {
      console.error("Pitch map save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/about");
    revalidatePath("/en/about");
    revalidatePath("/location");
    revalidatePath("/en/location");

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Pitch map save unexpected error:", error);
    return NextResponse.json({ error: "Erro ao guardar mapa" }, { status: 500 });
  }
}
