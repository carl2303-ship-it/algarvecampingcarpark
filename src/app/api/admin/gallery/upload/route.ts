import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImageExtension } from "@/lib/gallery-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

export async function POST(request: Request) {
  try {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const title_pt = String(formData.get("title_pt") ?? "").trim();
    const title_en = String(formData.get("title_en") ?? "").trim() || null;

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
    }
    if (!title_pt) {
      return NextResponse.json({ error: "Título PT obrigatório" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagem demasiado grande (máx. 5 MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Formato não suportado. Use JPG, PNG ou WebP." },
        { status: 400 }
      );
    }

    const extension = getImageExtension(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Formato de imagem inválido." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type;
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    let supabase;
    try {
      supabase = createAdminClient();
    } catch (adminError) {
      console.error("Gallery admin client error:", adminError);
      return NextResponse.json(
        { error: "Configuração do servidor incompleta. Contacte o administrador." },
        { status: 500 }
      );
    }

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(filename, buffer, { contentType, upsert: false });

    if (uploadError) {
      console.error("Gallery storage upload failed:", uploadError);
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
      console.error("Gallery DB insert failed:", error);
      await supabase.storage.from("gallery").remove([filename]);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ image: data });
  } catch (error) {
    console.error("Gallery upload unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao carregar imagem";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
