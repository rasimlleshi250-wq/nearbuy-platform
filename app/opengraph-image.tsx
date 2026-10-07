import { ImageResponse } from "next/og";

// Imazhi që del kur dikush ndan lidhjen e NearBuy në WhatsApp, Facebook, Viber etj.
export const alt = "NearBuy.al — Materiale ndërtimi dhe mjeshtër të besuar, pranë teje";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#15130F", padding: "72px 80px", color: "#F7F4EE" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10.5" stroke="#F7F4EE" strokeWidth="1.75" />
            <circle cx="12" cy="12" r="6.25" stroke="#F97316" strokeWidth="1.75" />
            <circle cx="12" cy="12" r="2.5" fill="#F97316" />
          </svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
            <span>NearBuy</span>
            <span style={{ color: "#F97316" }}>.al</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            <span>Materiale ndërtimi</span>
            <span style={{ color: "#F97316" }}>dhe mjeshtër, pranë teje.</span>
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#D9D3C7" }}>
            Krahaso çmimet e dyqaneve dhe gjej mjeshtër të besuar.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
