import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const title_pt = String(formData.get("title_pt") ?? "").trim();
  const title_en = String(formData.get("title_en") ?? "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
  }
  if (!title_pt) {
    return NextResponse.json({ error: "Título PT obrigatório" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem demasiado grande (máx. 8 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await sharp(buffer)
    .rotate()
    .resize(1500, 900, { fit: "cover", position: "centre" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from("gallery")
    .upload(filename, processed, { contentType: "image/jpeg", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(filename);
  const src = urlData.publicUrl;

  const { data: maxRow } = await supabase
    .from("gallery_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("gallery_images")
    .insert({ src, title_pt, title_en, sort_order })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("gallery").remove([filename]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ image: data });
}
