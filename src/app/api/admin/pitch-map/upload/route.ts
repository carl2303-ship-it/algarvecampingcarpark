import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { optimizeImageForStorage } from "@/lib/gallery-upload";
import { deleteMediaByUrl, putMedia } from "@/lib/media-store";
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

function supabaseStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "");
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

    const raw = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImageForStorage(raw, { maxWidth: 1200, quality: 75 });
    const key = `pitch/${code}-${Date.now()}.${optimized.extension}`;
    const image_url = await putMedia(key, optimized.buffer, optimized.contentType);

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("pitch_map_spots")
      .select("image_url")
      .eq("code", code)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Lugar não encontrado" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("pitch_map_spots")
      .update({ image_url })
      .eq("code", code);

    if (updateError) {
      console.error("Pitch photo DB update failed:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (existing.image_url) {
      await deleteMediaByUrl(existing.image_url);
      const oldSupabasePath = supabaseStoragePath(existing.image_url, "pitch-photos");
      if (oldSupabasePath) {
        await supabase.storage.from("pitch-photos").remove([oldSupabasePath]);
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
