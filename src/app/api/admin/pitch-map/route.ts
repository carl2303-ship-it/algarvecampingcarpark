import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { getPitchMapSpotsAdmin } from "@/lib/pitch-map";
import {
  getSpotZoneSlug,
  PRICING_ZONE_SLUGS,
} from "@/lib/park-pitch-map-defaults";
import { revalidateMarketingPaths } from "@/lib/revalidate-marketing";

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
  panoramic: z.boolean().optional(),
  electric: z.boolean().optional(),
  over_9m: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  image_url: z.string().nullable().optional(),
  width_m: z.number().positive().nullable().optional(),
  length_m: z.number().positive().nullable().optional(),
  electricity_distance_m: z.number().min(0).nullable().optional(),
  zone_slug: z.enum(PRICING_ZONE_SLUGS).nullable().optional(),
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
      const electric = Boolean(spot.electric);
      const over_9m = Boolean(spot.over_9m);
      const zone_slug = getSpotZoneSlug({
        electric,
        zone_slug: spot.zone_slug ?? (electric ? "com-eletricidade" : "sem-eletricidade"),
      });
      return {
        code: spot.code.trim().toUpperCase(),
        x: Number(spot.x.toFixed(2)),
        y: Number(spot.y.toFixed(2)),
        panoramic: false,
        electric,
        over_9m,
        sort_order: spot.sort_order ?? index + 1,
        image_url: spot.image_url ?? null,
        width_m: spot.width_m != null ? Number(spot.width_m.toFixed(2)) : null,
        length_m: spot.length_m != null ? Number(spot.length_m.toFixed(2)) : null,
        electricity_distance_m:
          spot.electricity_distance_m != null
            ? Number(spot.electricity_distance_m.toFixed(1))
            : null,
        zone_slug,
      };
    });

    const { error } = await supabase.from("pitch_map_spots").upsert(rows, { onConflict: "code" });
    if (error) {
      console.error("Pitch map save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const savedCodes = new Set(rows.map((row) => row.code));
    const { data: existingRows, error: existingError } = await supabase
      .from("pitch_map_spots")
      .select("code");

    if (existingError) {
      console.error("Pitch map list for sync error:", existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const toDelete = (existingRows ?? [])
      .map((row) => String(row.code))
      .filter((code) => !savedCodes.has(code.toUpperCase()));

    if (toDelete.length > 0) {
      const { data: activeReservations, error: reservationError } = await supabase
        .from("reservations")
        .select("pitch_code")
        .in("pitch_code", toDelete)
        .in("status", ["pending_payment", "confirmed", "checked_in"]);

      if (reservationError) {
        console.error("Pitch map delete check error:", reservationError);
        return NextResponse.json({ error: reservationError.message }, { status: 500 });
      }

      const blockedCodes = [
        ...new Set(
          (activeReservations ?? [])
            .map((row) => row.pitch_code)
            .filter((code): code is string => Boolean(code))
        ),
      ];

      if (blockedCodes.length > 0) {
        return NextResponse.json(
          {
            error: `Impossible de supprimer ${blockedCodes.join(", ")} : réservation(s) active(s).`,
            blocked_codes: blockedCodes,
          },
          { status: 409 }
        );
      }

      const { error: deleteError } = await supabase
        .from("pitch_map_spots")
        .delete()
        .in("code", toDelete);

      if (deleteError) {
        console.error("Pitch map delete error:", deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    // Keep zone capacity aligned with map inventory (pricing zones only)
    for (const slug of PRICING_ZONE_SLUGS) {
      const count = rows.filter((row) => row.zone_slug === slug).length;
      const { error: capacityError } = await supabase
        .from("zones")
        .update({ capacity: Math.max(count, 1) })
        .eq("slug", slug);
      if (capacityError) {
        console.error(`Pitch map capacity sync (${slug}):`, capacityError);
      }
    }

    revalidateMarketingPaths(["/about", "/location", "/book"]);

    return NextResponse.json({ success: true, count: rows.length, deleted: toDelete.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Pitch map save unexpected error:", error);
    return NextResponse.json({ error: "Erro ao guardar mapa" }, { status: 500 });
  }
}
