import { createPublicServerClient, getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import type { GalleryImageRecord } from "@/types/database";

export interface GalleryImage {
  id?: string;
  src: string;
  alt_pt: string;
  alt_en: string;
}

export const EMPTY_GALLERY: GalleryImage[] = [];

export function toGalleryImage(row: GalleryImageRecord): GalleryImage {
  return {
    id: row.id,
    src: row.src,
    alt_pt: row.title_pt,
    alt_en: row.title_en ?? row.title_pt,
  };
}

export async function getGalleryImages(options?: {
  includeInactive?: boolean;
}): Promise<GalleryImage[]> {
  if (!getPublicSupabaseConfig()) {
    return EMPTY_GALLERY;
  }

  const supabase = createPublicServerClient();
  let query = supabase.from("gallery_images").select("*").order("sort_order");

  if (!options?.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Gallery fetch error:", error.message);
    return EMPTY_GALLERY;
  }

  return (data ?? []).map(toGalleryImage);
}

export async function getGalleryImagesAdmin(): Promise<GalleryImageRecord[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
}
