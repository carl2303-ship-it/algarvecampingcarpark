import { ImageResponse } from "next/og";

export const runtime = "edge";

const ALLOWED = new Set(["192", "512"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  if (!ALLOWED.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  const px = parseInt(size, 10);
  const fontSize = Math.round(px * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a5c45 0%, #0f3d2e 100%)",
          borderRadius: Math.round(px * 0.18),
        }}
      >
        <div style={{ fontSize, lineHeight: 1 }}>🏕️</div>
      </div>
    ),
    { width: px, height: px }
  );
}
