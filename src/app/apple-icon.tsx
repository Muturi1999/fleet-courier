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
          background: "#0B1C3B",
          borderRadius: 36,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 90, height: 40, background: "#E8A020", borderRadius: 8 }} />
          <div style={{ width: 110, height: 28, background: "#F5C563", borderRadius: 6 }} />
          <div style={{ width: 120, height: 14, background: "#E8A020", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
