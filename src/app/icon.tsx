import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div style={{ width: 18, height: 8, background: "#E8A020", borderRadius: 2 }} />
          <div style={{ width: 22, height: 6, background: "#F5C563", borderRadius: 2 }} />
          <div style={{ width: 24, height: 3, background: "#E8A020", borderRadius: 1 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
