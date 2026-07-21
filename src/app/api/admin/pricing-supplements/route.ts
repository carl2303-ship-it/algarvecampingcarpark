import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const triggerSchema = z.enum([
  "extra_guest",
  "motorhome_over_9m",
  "electricity_10a",
  "manual_per_night",
]);

const createSchema = z.object({
  name_pt: z.string().min(1),
  name_en: z.string().optional(),
  description_pt: z.string().optional(),
  description_en: z.string().optional(),
  amount_cents_per_night: z.number().int().min(0),
  trigger_type: triggerSchema.default("manual_per_night"),
  applies_online: z.boolean().optional(),
  applies_admin: z.boolean().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pricing_supplements")
    .select("*")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplements: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());
    if (body.trigger_type !== "manual_per_night") {
      return NextResponse.json(
        { error: "Seuls les suppléments manuels peuvent être créés." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from("pricing_supplements")
      .select("id", { count: "exact", head: true });

    const { data, error } = await supabase
      .from("pricing_supplements")
      .insert({
        ...body,
        slug: null,
        is_system: false,
        trigger_config: {},
        applies_online: body.applies_online ?? false,
        applies_admin: body.applies_admin ?? true,
        active: body.active ?? true,
        sort_order: body.sort_order ?? (count ?? 0) + 1,
      })
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
