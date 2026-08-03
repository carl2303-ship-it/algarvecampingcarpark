import { promises as fs } from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "site-media";
const LOCAL_ROOT = path.join(process.cwd(), ".data", "media");

export function mediaPublicPath(key: string): string {
  const clean = key.replace(/^\/+/, "");
  return `/media/${clean}`;
}

/** Extract blob key from `/media/...` or absolute same-origin media URL. */
export function mediaKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const pathname = url.startsWith("http") ? new URL(url).pathname : url;
    if (!pathname.startsWith("/media/")) return null;
    const key = decodeURIComponent(pathname.slice("/media/".length));
    return key || null;
  } catch {
    return null;
  }
}

function isMissingBlobsEnv(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "MissingBlobsEnvironmentError"
  );
}

function openBlobStore() {
  const siteID = process.env.NETLIFY_SITE_ID ?? process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN ?? process.env.NETLIFY_BLOBS_TOKEN;

  if (siteID && token) {
    return getStore({
      name: STORE_NAME,
      consistency: "strong",
      siteID,
      token,
    });
  }

  return getStore({ name: STORE_NAME, consistency: "strong" });
}

function localFilePath(key: string): string {
  return path.join(LOCAL_ROOT, ...key.split("/").filter(Boolean));
}

async function putLocal(key: string, data: Buffer, contentType: string): Promise<void> {
  const filePath = localFilePath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  await fs.writeFile(`${filePath}.meta.json`, JSON.stringify({ contentType }), "utf8");
}

async function getLocal(
  key: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const filePath = localFilePath(key);
  try {
    const data = await fs.readFile(filePath);
    let contentType = "application/octet-stream";
    try {
      const meta = JSON.parse(await fs.readFile(`${filePath}.meta.json`, "utf8")) as {
        contentType?: string;
      };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      if (key.endsWith(".webp")) contentType = "image/webp";
      else if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (key.endsWith(".png")) contentType = "image/png";
    }
    return { data, contentType };
  } catch {
    return null;
  }
}

async function deleteLocal(key: string): Promise<void> {
  const filePath = localFilePath(key);
  await fs.unlink(filePath).catch(() => undefined);
  await fs.unlink(`${filePath}.meta.json`).catch(() => undefined);
}

/**
 * Persist media on Netlify Blobs (production) or `.data/media` (local next dev).
 * Returns a same-origin path `/media/...` — no Supabase Storage egress.
 */
export async function putMedia(
  key: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, "");
  try {
    const store = openBlobStore();
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    await store.set(cleanKey, arrayBuffer, { metadata: { contentType } });
  } catch (error) {
    if (!isMissingBlobsEnv(error)) throw error;
    await putLocal(cleanKey, data, contentType);
  }
  return mediaPublicPath(cleanKey);
}

export async function getMedia(
  key: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const cleanKey = key.replace(/^\/+/, "");
  try {
    const store = openBlobStore();
    const result = await store.getWithMetadata(cleanKey, { type: "arrayBuffer" });
    if (!result) return null;
    const contentType =
      typeof result.metadata?.contentType === "string"
        ? result.metadata.contentType
        : cleanKey.endsWith(".webp")
          ? "image/webp"
          : "application/octet-stream";
    return { data: Buffer.from(result.data), contentType };
  } catch (error) {
    if (!isMissingBlobsEnv(error)) throw error;
    return getLocal(cleanKey);
  }
}

export async function deleteMedia(key: string): Promise<void> {
  const cleanKey = key.replace(/^\/+/, "");
  try {
    const store = openBlobStore();
    await store.delete(cleanKey);
  } catch (error) {
    if (!isMissingBlobsEnv(error)) throw error;
    await deleteLocal(cleanKey);
  }
}

export async function deleteMediaByUrl(url: string | null | undefined): Promise<void> {
  const key = mediaKeyFromUrl(url);
  if (key) await deleteMedia(key);
}
