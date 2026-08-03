import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { optimizeImageForStorage } from "@/lib/gallery-upload";
import { putMedia } from "@/lib/media-store";
import { revalidateMarketingPaths } from "@/lib/revalidate-marketing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type MigrateResult = {
  id: string;
  kind: "gallery" | "pitch";
  ok: boolean;
  from?: string;
  to?: string;
  bytesBefore?: number;
  bytesAfter?: number;
  error?: string;
};

async function downloadUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download falhou (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function alreadyOnNetlify(url: string): boolean {
  return url.startsWith("/media/") || url.includes("/media/");
}

/**
 * One-shot: copy gallery + pitch photos from Supabase Storage → Netlify Blobs,
 * then point DB URLs to `/media/...` (same origin, no Supabase egress).
 *
 * Run on production after deploy (admin session):
 *   fetch('/api/admin/storage/migrate-to-netlify',{method:'POST'}).then(r=>r.json())
 */
export async function POST() {
  try {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const results: MigrateResult[] = [];

    const { data: galleryRows, error: galleryError } = await supabase
      .from("gallery_images")
      .select("id, src")
      .order("sort_order", { ascending: true });

    if (galleryError) {
      return NextResponse.json({ error: galleryError.message }, { status: 500 });
    }

    for (const row of galleryRows ?? []) {
      if (alreadyOnNetlify(row.src)) {
        results.push({ id: row.id, kind: "gallery", ok: true, from: row.src, to: row.src });
        continue;
      }
      try {
        const raw = await downloadUrl(row.src);
        const optimized = await optimizeImageForStorage(raw, { maxWidth: 1600, quality: 78 });
        const key = `gallery/${row.id}-${Date.now()}.webp`;
        const to = await putMedia(key, optimized.buffer, optimized.contentType);
        const { error: updateError } = await supabase
          .from("gallery_images")
          .update({ src: to })
          .eq("id", row.id);
        if (updateError) throw new Error(updateError.message);
        results.push({
          id: row.id,
          kind: "gallery",
          ok: true,
          from: row.src,
          to,
          bytesBefore: raw.length,
          bytesAfter: optimized.buffer.length,
        });
      } catch (err) {
        results.push({
          id: row.id,
          kind: "gallery",
          ok: false,
          from: row.src,
          error: err instanceof Error ? err.message : "erro",
        });
      }
    }

    const { data: pitchRows, error: pitchError } = await supabase
      .from("pitch_map_spots")
      .select("code, image_url")
      .not("image_url", "is", null);

    if (pitchError) {
      return NextResponse.json({ error: pitchError.message, results }, { status: 500 });
    }

    for (const row of pitchRows ?? []) {
      if (!row.image_url) continue;
      if (alreadyOnNetlify(row.image_url)) {
        results.push({
          id: row.code,
          kind: "pitch",
          ok: true,
          from: row.image_url,
          to: row.image_url,
        });
        continue;
      }
      try {
        const raw = await downloadUrl(row.image_url);
        const optimized = await optimizeImageForStorage(raw, { maxWidth: 1200, quality: 75 });
        const key = `pitch/${row.code}-${Date.now()}.webp`;
        const to = await putMedia(key, optimized.buffer, optimized.contentType);
        const { error: updateError } = await supabase
          .from("pitch_map_spots")
          .update({ image_url: to })
          .eq("code", row.code);
        if (updateError) throw new Error(updateError.message);
        results.push({
          id: row.code,
          kind: "pitch",
          ok: true,
          from: row.image_url,
          to,
          bytesBefore: raw.length,
          bytesAfter: optimized.buffer.length,
        });
      } catch (err) {
        results.push({
          id: row.code,
          kind: "pitch",
          ok: false,
          from: row.image_url,
          error: err instanceof Error ? err.message : "erro",
        });
      }
    }

    revalidateMarketingPaths(["/", "/about", "/location", "/book"]);

    const ok = results.filter((r) => r.ok && r.from !== r.to);
    const skipped = results.filter((r) => r.ok && r.from === r.to);
    const failed = results.filter((r) => !r.ok);
    const savedBytes = ok.reduce(
      (sum, r) => sum + ((r.bytesBefore ?? 0) - (r.bytesAfter ?? 0)),
      0
    );

    return NextResponse.json({
      success: failed.length === 0,
      migrated: ok.length,
      skipped: skipped.length,
      failed: failed.length,
      savedBytes,
      savedMB: Math.round((savedBytes / (1024 * 1024)) * 10) / 10,
      results,
    });
  } catch (error) {
    console.error("Migrate to Netlify failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
