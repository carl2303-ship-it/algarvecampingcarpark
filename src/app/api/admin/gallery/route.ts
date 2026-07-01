import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { getGalleryImagesAdmin } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const images = await getGalleryImagesAdmin();
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Gallery list error:", error);
    return NextResponse.json({ error: "Erro ao carregar galeria" }, { status: 500 });
  }
}
