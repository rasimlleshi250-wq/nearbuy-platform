import { ImageResponse } from "next/og";

// Ikona kur dikush e shton NearBuy në ekranin kryesor të iPhone-it
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F97316" }}>
        <svg width="120" height="120" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" stroke="#15130F" strokeWidth="3.5" />
          <circle cx="24" cy="24" r="12.5" stroke="#FFFFFF" strokeWidth="3.5" />
          <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
