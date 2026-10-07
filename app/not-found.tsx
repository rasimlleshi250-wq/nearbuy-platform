import Link from "next/link";

// Faqja që del kur një adresë nuk ekziston (404)
export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <p style={{ fontSize: "4rem", fontWeight: 800, color: "#f97316", lineHeight: 1, margin: 0 }}>404</p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Kjo faqe nuk u gjet</h1>
        <p style={{ fontSize: "0.95rem", color: "#a1a1aa", lineHeight: 1.6, margin: 0 }}>
          Lidhja mund të jetë e vjetër ose e shkruar gabim. Provo të kërkosh produktin ose mjeshtrin nga faqja kryesore.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
          <Link href="/" style={{ padding: "0.7rem 1.3rem", background: "#f97316", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Faqja kryesore</Link>
          <Link href="/professionals" style={{ padding: "0.7rem 1.3rem", border: "1px solid rgba(255,255,255,0.15)", color: "#e4e4e7", borderRadius: 10, textDecoration: "none", fontWeight: 600 }}>Gjej mjeshtër</Link>
        </div>
      </div>
    </main>
  );
}
