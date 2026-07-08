const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getImageExtension(mimeType: string): string | null {
  return MIME_TO_EXTENSION[mimeType] ?? null;
}
