import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateMarketingPaths } from "@/lib/revalidate-marketing";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const createSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  capacity: z.number().int().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  description_en: z.string().max(2000).nullable().optional(),
  amenities: z.array(z.string().max(80)).max(30).optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
});

function revalidateZonePaths() {
  revalidatePath("/admin/zones");
  revalidateMarketingPaths(["/prices", "/book", "/about"]);
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("zones").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const zones = (data ?? []).map((z) => ({
    ...z,
    amenities: Array.isArray(z.amenities) ? z.amenities : [],
  }));

  return NextResponse.json({ zones });
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());
    const slug = body.slug ?? slugify(body.name);
    if (!slug) {
      return NextResponse.json({ error: "Slug invalide" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("zones")
      .insert({
        name: body.name.trim(),
        slug,
        capacity: body.capacity,
        description: body.description?.trim() || null,
        description_en: body.description_en?.trim() || null,
        amenities: body.amenities ?? [],
        active: body.active ?? true,
        sort_order: body.sort_order ?? 99,
      })
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
