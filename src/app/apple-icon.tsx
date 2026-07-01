import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 32,
          fontSize: 88,
        }}
      >
        🏕️
      </div>
    ),
    { ...size }
  );
}
