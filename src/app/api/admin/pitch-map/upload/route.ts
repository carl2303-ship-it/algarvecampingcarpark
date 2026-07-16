import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImageExtension } from "@/lib/gallery-upload";
import { revalidateMarketingPaths } from "@/lib/revalidate-marketing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

function revalidatePitchMapPages() {
  revalidateMarketingPaths(["/about", "/location"]);
}

export async function POST(request: Request) {
  try {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const code = String(formData.get("code") ?? "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Código do lugar obrigatório" }, { status: 400 });
    }
    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
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
    const filename = `${code}-${Date.now()}.${extension}`;

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("pitch_map_spots")
      .select("image_url")
      .eq("code", code)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Lugar não encontrado" }, { status: 404 });
    }

    const { error: uploadError } = await supabase.storage
      .from("pitch-photos")
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Pitch photo upload failed:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("pitch-photos").getPublicUrl(filename);
    const image_url = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("pitch_map_spots")
      .update({ image_url })
      .eq("code", code);

    if (updateError) {
      console.error("Pitch photo DB update failed:", updateError);
      await supabase.storage.from("pitch-photos").remove([filename]);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (existing.image_url?.includes("/pitch-photos/")) {
      const oldPath = existing.image_url.split("/pitch-photos/")[1];
      if (oldPath) {
        await supabase.storage.from("pitch-photos").remove([oldPath]);
      }
    }

    revalidatePitchMapPages();

    return NextResponse.json({ success: true, image_url });
  } catch (error) {
    console.error("Pitch photo upload unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao carregar imagem";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
