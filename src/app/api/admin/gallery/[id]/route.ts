import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title_pt: z.string().min(1).optional(),
  title_en: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
});

function storagePathFromUrl(src: string): string | null {
  const marker = "/storage/v1/object/public/gallery/";
  const idx = src.indexOf(marker);
  if (idx === -1) return null;
  return src.slice(idx + marker.length);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = updateSchema.parse(await request.json());
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gallery_images")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ image: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: row } = await supabase.from("gallery_images").select("src").eq("id", id).single();

  const { error } = await supabase.from("gallery_images").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.src) {
    const path = storagePathFromUrl(row.src);
    if (path) {
      await supabase.storage.from("gallery").remove([path]);
    }
  }

  return NextResponse.json({ success: true });
}
