import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateMarketingPaths } from "@/lib/revalidate-marketing";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  description_en: z.string().max(2000).nullable().optional(),
  amenities: z.array(z.string().max(80)).max(30).optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
});

const deleteSchema = z.object({
  reassign_to: z.string().uuid().optional(),
});

function revalidateZonePaths() {
  revalidatePath("/admin/zones");
  revalidateMarketingPaths(["/prices", "/book", "/about"]);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = updateSchema.parse(await request.json());
    const supabase = createAdminClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.slug !== undefined) patch.slug = body.slug;
    if (body.capacity !== undefined) patch.capacity = body.capacity;
    if (body.description !== undefined) {
      patch.description = body.description?.trim() || null;
    }
    if (body.description_en !== undefined) {
      patch.description_en = body.description_en?.trim() || null;
    }
    if (body.amenities !== undefined) patch.amenities = body.amenities;
    if (body.active !== undefined) patch.active = body.active;
    if (body.sort_order !== undefined) patch.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from("zones")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ce slug existe déjà." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateZonePaths();
    return NextResponse.json({
      zone: { ...data, amenities: Array.isArray(data.amenities) ? data.amenities : [] },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    let reassignTo: string | undefined;
    try {
      const body = deleteSchema.parse(await request.json().catch(() => ({})));
      reassignTo = body.reassign_to;
    } catch {
      reassignTo = undefined;
    }

    const supabase = createAdminClient();

    const { data: zone, error: zoneError } = await supabase
      .from("zones")
      .select("id, name, slug")
      .eq("id", id)
      .maybeSingle();

    if (zoneError || !zone) {
      return NextResponse.json({ error: "Zone introuvable" }, { status: 404 });
    }

    const { count: reservationCount } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("zone_id", id);

    const hasReservations = (reservationCount ?? 0) > 0;

    if (hasReservations) {
      if (!reassignTo) {
        return NextResponse.json(
          {
            error:
              "Cette zone a des réservations. Choisissez une zone de réaffectation, ou désactivez-la.",
            reservation_count: reservationCount,
            requires_reassign: true,
          },
          { status: 409 }
        );
      }

      if (reassignTo === id) {
        return NextResponse.json(
          { error: "La zone de réaffectation doit être différente." },
          { status: 400 }
        );
      }

      const { data: target } = await supabase
        .from("zones")
        .select("id")
        .eq("id", reassignTo)
        .maybeSingle();

      if (!target) {
        return NextResponse.json(
          { error: "Zone de réaffectation introuvable." },
          { status: 400 }
        );
      }

      const { error: moveResError } = await supabase
        .from("reservations")
        .update({ zone_id: reassignTo })
        .eq("zone_id", id);

      if (moveResError) {
        return NextResponse.json({ error: moveResError.message }, { status: 500 });
      }

      await supabase.from("pitches").update({ zone_id: reassignTo }).eq("zone_id", id);
      await supabase.from("blocked_dates").update({ zone_id: reassignTo }).eq("zone_id", id);
    }

    const { error: deleteError } = await supabase.from("zones").delete().eq("id", id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    revalidateZonePaths();
    return NextResponse.json({
      success: true,
      deleted: zone.slug,
      reassigned_to: hasReservations ? reassignTo : null,
    });
  } catch (error) {
    console.error("Delete zone error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
