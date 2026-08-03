import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { optimizeImageForStorage } from "@/lib/gallery-upload";
import { putMedia } from "@/lib/media-store";
import { revalidateMarketingPaths } from "@/lib/revalidate-marketing";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Netlify sync functions are short — migrate in tiny batches. */
export const maxDuration = 60;

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

type PendingItem =
  | { kind: "gallery"; id: string; url: string }
  | { kind: "pitch"; id: string; url: string };

/** Only Supabase Storage URLs generate Cached Egress — skip /media and /gallery static. */
function needsSupabaseMigration(url: string): boolean {
  return (
    url.includes("supabase.co/storage") ||
    url.includes("/storage/v1/object/public/")
  );
}

async function downloadUrl(url: string): Promise<Buffer> {
  const absolute = url.startsWith("http")
    ? url
    : `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  const res = await fetch(absolute);
  if (!res.ok) {
    throw new Error(`Download falhou (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function listPending(
  supabase: ReturnType<typeof createAdminClient>
): Promise<PendingItem[]> {
  const pending: PendingItem[] = [];

  const { data: galleryRows, error: galleryError } = await supabase
    .from("gallery_images")
    .select("id, src")
    .order("sort_order", { ascending: true });

  if (galleryError) throw new Error(galleryError.message);

  for (const row of galleryRows ?? []) {
    if (needsSupabaseMigration(row.src)) {
      pending.push({ kind: "gallery", id: row.id, url: row.src });
    }
  }

  const { data: pitchRows, error: pitchError } = await supabase
    .from("pitch_map_spots")
    .select("code, image_url")
    .not("image_url", "is", null);

  if (pitchError) throw new Error(pitchError.message);

  for (const row of pitchRows ?? []) {
    if (row.image_url && needsSupabaseMigration(row.image_url)) {
      pending.push({ kind: "pitch", id: row.code, url: row.image_url });
    }
  }

  return pending;
}

async function migrateOne(
  supabase: ReturnType<typeof createAdminClient>,
  item: PendingItem
): Promise<MigrateResult> {
  try {
    const raw = await downloadUrl(item.url);
    const optimized =
      item.kind === "gallery"
        ? await optimizeImageForStorage(raw, { maxWidth: 1600, quality: 78 })
        : await optimizeImageForStorage(raw, { maxWidth: 1200, quality: 75 });

    const key =
      item.kind === "gallery"
        ? `gallery/${item.id}-${Date.now()}.webp`
        : `pitch/${item.id}-${Date.now()}.webp`;

    const to = await putMedia(key, optimized.buffer, optimized.contentType);

    if (item.kind === "gallery") {
      const { error } = await supabase
        .from("gallery_images")
        .update({ src: to })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("pitch_map_spots")
        .update({ image_url: to })
        .eq("code", item.id);
      if (error) throw new Error(error.message);
    }

    return {
      id: item.id,
      kind: item.kind,
      ok: true,
      from: item.url,
      to,
      bytesBefore: raw.length,
      bytesAfter: optimized.buffer.length,
    };
  } catch (err) {
    return {
      id: item.id,
      kind: item.kind,
      ok: false,
      from: item.url,
      error: err instanceof Error ? err.message : "erro",
    };
  }
}

/**
 * Migrate a small batch of Supabase Storage URLs → Netlify Blobs.
 * Default limit=2 to stay under Netlify gateway timeout.
 *
 * Console (admin on production):
 *   (async()=>{for(;;){const j=await(await fetch('/api/admin/storage/migrate-to-netlify?limit=2',{method:'POST'})).json();console.log(j);if(j.done||j.error)break;}})()
 */
export async function POST(request: Request) {
  try {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      5,
      Math.max(1, parseInt(searchParams.get("limit") ?? "2", 10) || 2)
    );

    const supabase = createAdminClient();
    const pending = await listPending(supabase);

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        done: true,
        migrated: 0,
        failed: 0,
        remaining: 0,
        message:
          "Nada a migrar: fotos já estão em /media ou em ficheiros estáticos (/gallery), sem egress Supabase.",
        results: [],
      });
    }

    const batch = pending.slice(0, limit);
    const results: MigrateResult[] = [];

    for (const item of batch) {
      results.push(await migrateOne(supabase, item));
    }

    const stillPending = (await listPending(supabase)).length;
    const finished = stillPending === 0;
    const migrated = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    if (migrated.length > 0 || finished) {
      revalidateMarketingPaths(["/", "/about", "/location", "/book"]);
    }

    const savedBytes = migrated.reduce(
      (sum, r) => sum + ((r.bytesBefore ?? 0) - (r.bytesAfter ?? 0)),
      0
    );

    return NextResponse.json({
      success: failed.length === 0,
      done: finished,
      migrated: migrated.length,
      failed: failed.length,
      remaining: stillPending,
      batchSize: limit,
      savedBytes,
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
