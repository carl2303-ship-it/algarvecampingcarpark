import sharp from "sharp";

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** 1 year — browsers keep the file; Smart CDN still serves from edge. */
export const STORAGE_CACHE_CONTROL = "31536000";

export function getImageExtension(mimeType: string): string | null {
  return MIME_TO_EXTENSION[mimeType] ?? null;
}

export type OptimizedImage = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
};

/**
 * Resize + convert to WebP before upload (Netlify Blobs / local fallback).
 * Gallery / pitch photos rarely need >1600px on the public site.
 */
export async function optimizeImageForStorage(
  input: Buffer,
  options?: { maxWidth?: number; quality?: number }
): Promise<OptimizedImage> {
  const maxWidth = options?.maxWidth ?? 1600;
  const quality = options?.quality ?? 78;

  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxWidth,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();

  return { buffer, contentType: "image/webp", extension: "webp" };
}
