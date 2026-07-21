import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  name_pt: z.string().min(1).optional(),
  name_en: z.string().nullable().optional(),
  description_pt: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  amount_cents_per_night: z.number().int().min(0).optional(),
  applies_online: z.boolean().optional(),
  applies_admin: z.boolean().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

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

    const { data: existing, error: fetchError } = await supabase
      .from("pricing_supplements")
      .select("is_system")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Supplément introuvable" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("pricing_supplements")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ supplement: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("pricing_supplements")
    .select("is_system")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Supplément introuvable" }, { status: 404 });
  }

  if (existing.is_system) {
    return NextResponse.json(
      { error: "Les suppléments système ne peuvent pas être supprimés." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("pricing_supplements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
