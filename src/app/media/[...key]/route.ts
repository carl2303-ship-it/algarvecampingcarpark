import { getMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ONE_YEAR = "public, max-age=31536000, immutable";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: parts } = await params;
  const key = parts.map((p) => decodeURIComponent(p)).join("/");

  if (!key || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const media = await getMedia(key);
    if (!media) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(new Uint8Array(media.data), {
      status: 200,
      headers: {
        "Content-Type": media.contentType,
        "Cache-Control": ONE_YEAR,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Media serve failed:", error);
    return new Response("Error", { status: 500 });
  }
}
