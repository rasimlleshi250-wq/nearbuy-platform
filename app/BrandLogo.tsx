// Logoja e NearBuy: pika me dy rrathë + "NearBuy.al".
// dark = true kur logoja është mbi sfond të errët (teksti del i çelët).

export default function BrandLogo({ size = 19, dark = true }: { size?: number; dark?: boolean }) {
  const ink = dark ? "#F7F4EE" : "#15130F";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.45), fontSize: size, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: ink }}>
      <svg width={Math.round(size * 1.4)} height={Math.round(size * 1.4)} viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="none" stroke={ink} strokeWidth="3.5" />
        <circle cx="24" cy="24" r="12.5" fill="none" stroke="#F97316" strokeWidth="3.5" />
        <circle cx="24" cy="24" r="5" fill="#F97316" />
      </svg>
      <span style={{ color: ink }}>NearBuy<span style={{ color: "#F97316" }}>.al</span></span>
    </span>
  );
}
