"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Link from "next/link";
import { Professional } from "@/types";

const CITIES = ["Të gjitha", "Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat"];
const PROFESSIONS = ["Të gjitha", "Elektriçist", "Hidraulik", "Murator", "Bojaxhi", "Karpentier", "Instalues kondicionerësh", "Teknik elektronike", "Gipsar", "Fasadist", "Pastruese", "Fotograf"];

function ProfessionalsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(searchParams.get("city") || "Të gjitha");
  const [profession, setProfession] = useState(searchParams.get("prof") || "Të gjitha");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const constraints = [where("verified", "==", true)];
        const snap = await getDocs(query(collection(db, "professionals"), ...constraints));
        setProfessionals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Professional)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = professionals
    .filter(p => city === "Të gjitha" || p.city === city)
    .filter(p => profession === "Të gjitha" || p.profession === profession)
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.profession?.toLowerCase().includes(search.toLowerCase()) ||
      p.services?.some(s => s.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  return (
    <div className="prof-root">
      {/* Header */}
      <header className="prof-header">
        <div className="prof-header-inner">
          <Link href="/" className="prof-brand">Near<span>Buy</span>.al</Link>
          <div className="prof-header-right">
            <Link href="/search" className="prof-nav-link">🛍 Produkte</Link>
            <Link href="/auth/login" className="prof-login-btn">Hyr</Link>
          </div>
        </div>

        <div className="prof-filters">
          <div className="prof-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Kërko profesionist..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={city} onChange={e => setCity(e.target.value)} className="prof-filter-select">
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={profession} onChange={e => setProfession(e.target.value)} className="prof-filter-select">
            {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </header>

      <main className="prof-main">
        <div className="prof-page-title">
          <h1>Profesionistë</h1>
          <p>{filtered.length} profesionistë të disponueshëm</p>
        </div>

        {loading ? (
          <div className="prof-loading">
            <div className="prof-spinner" />
            <p>Duke ngarkuar...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="prof-empty">
            <p>😕 Nuk u gjet asnjë profesionist për këto kritere.</p>
            <p>Provo të ndryshosh filtrat.</p>
          </div>
        ) : (
          <div className="prof-grid">
            {filtered.map(p => (
              <div key={p.id} className={`prof-card ${p.featured ? "featured" : ""}`}>
                {p.featured && <div className="prof-featured-ribbon">⭐ Pro</div>}
                <div className="prof-card-top">
                  <div className="prof-avatar">
                    {p.photo ? <img src={p.photo} alt={p.name} /> : <span>{p.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}</span>}
                  </div>
                  <div className="prof-info">
                    <h3 className="prof-name">{p.name}</h3>
                    <p className="prof-job">{p.profession}</p>
                    <p className="prof-city">📍 {p.city}</p>
                  </div>
                </div>

                {p.description && (
                  <p className="prof-desc">{p.description.slice(0, 100)}{p.description.length > 100 ? "..." : ""}</p>
                )}

                {p.services && p.services.length > 0 && (
                  <div className="prof-services">
                    {p.services.slice(0, 3).map((s, i) => (
                      <span key={i} className="prof-service">{s}</span>
                    ))}
                    {p.services.length > 3 && <span className="prof-service-more">+{p.services.length - 3}</span>}
                  </div>
                )}

                <div className="prof-card-footer">
                  <div className="prof-footer-info">
                    {p.pricePerHour && <span className="prof-price">{p.pricePerHour.toLocaleString()} L/orë</span>}
                    {p.experience && <span className="prof-exp">{p.experience} eksperiencë</span>}
                  </div>
                  <div className="prof-actions">
                    {p.location && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${(p.location as any).latitude},${(p.location as any).longitude}`}
                        target="_blank" rel="noopener noreferrer" className="prof-btn-maps">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Drejto
                      </a>
                    )}
                    <a href={`tel:${p.phone}`} className="prof-btn-call">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17.5z"/></svg>
                      Thirr
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .prof-root { min-height: 100vh; background: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #f5f5f4; }
        .prof-header { background: #111; border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 50; }
        .prof-header-inner { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; }
        .prof-brand { font-size: 1.1rem; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.02em; }
        .prof-brand span { color: #f5c842; }
        .prof-header-right { display: flex; align-items: center; gap: 12px; }
        .prof-nav-link { font-size: 0.82rem; color: #71717a; text-decoration: none; font-weight: 500; transition: color .2s; }
        .prof-nav-link:hover { color: #fff; }
        .prof-login-btn { padding: 0.45rem 1rem; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #a1a1aa; font-size: 0.8rem; text-decoration: none; transition: all .2s; }
        .prof-login-btn:hover { border-color: rgba(255,255,255,0.2); color: #fff; }
        .prof-filters { display: flex; gap: 8px; padding: 0.6rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; }
        .prof-search-wrap { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.4rem 0.9rem; flex: 1; min-width: 200px; color: #71717a; }
        .prof-search-wrap input { background: none; border: none; outline: none; color: #f4f4f5; font-size: 0.82rem; flex: 1; font-family: inherit; }
        .prof-search-wrap input::placeholder { color: #3f3f46; }
        .prof-filter-select { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #a1a1aa; font-size: 0.82rem; padding: 0.4rem 0.75rem; outline: none; cursor: pointer; font-family: inherit; }
        .prof-filter-select option { background: #1c1c1c; }
        .prof-main { max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; }
        .prof-page-title { margin-bottom: 1.5rem; }
        .prof-page-title h1 { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.025em; margin-bottom: 0.25rem; }
        .prof-page-title p { font-size: 0.85rem; color: #71717a; }
        .prof-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 4rem; color: #71717a; }
        .prof-spinner { width: 26px; height: 26px; border: 2px solid rgba(168,85,247,0.2); border-top-color: #c084fc; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .prof-empty { text-align: center; padding: 3rem; color: #71717a; }
        .prof-empty p { margin-bottom: 6px; font-size: 0.9rem; }
        .prof-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .prof-card { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.875rem; position: relative; transition: border-color .2s; }
        .prof-card:hover { border-color: rgba(255,255,255,0.15); }
        .prof-card.featured { border-color: rgba(249,115,22,0.3); }
        .prof-featured-ribbon { position: absolute; top: 12px; right: 12px; font-size: 0.7rem; background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.25); padding: 2px 8px; border-radius: 4px; font-weight: 700; }
        .prof-card-top { display: flex; align-items: center; gap: 12px; }
        .prof-avatar { width: 52px; height: 52px; border-radius: 50%; background: rgba(168,85,247,0.15); border: 2px solid rgba(168,85,247,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
        .prof-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .prof-avatar span { font-size: 1rem; font-weight: 700; color: #c084fc; }
        .prof-name { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
        .prof-job { font-size: 0.8rem; color: #f97316; font-weight: 600; margin-bottom: 3px; }
        .prof-city { font-size: 0.75rem; color: #71717a; }
        .prof-desc { font-size: 0.8rem; color: #71717a; line-height: 1.5; }
        .prof-services { display: flex; flex-wrap: wrap; gap: 5px; }
        .prof-service { background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.15); border-radius: 999px; padding: 2px 9px; font-size: 0.72rem; color: #c084fc; }
        .prof-service-more { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; padding: 2px 9px; font-size: 0.72rem; color: #71717a; }
        .prof-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.06); }
        .prof-footer-info { display: flex; flex-direction: column; gap: 2px; }
        .prof-price { font-size: 0.9rem; font-weight: 700; color: #f5c842; }
        .prof-exp { font-size: 0.72rem; color: #71717a; }
        .prof-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .prof-btn-maps, .prof-btn-call { display: flex; align-items: center; gap: 4px; padding: 0.42rem 0.8rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600; text-decoration: none; transition: all .15s; border: 1px solid; }
        .prof-btn-maps { background: rgba(59,130,246,0.1); color: #60a5fa; border-color: rgba(59,130,246,0.25); }
        .prof-btn-maps:hover { background: rgba(59,130,246,0.2); }
        .prof-btn-call { background: rgba(34,197,94,0.1); color: #4ade80; border-color: rgba(34,197,94,0.25); }
        .prof-btn-call:hover { background: rgba(34,197,94,0.2); }
        @media(max-width:640px) { .prof-main { padding: 1.25rem 1rem; } .prof-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default function ProfessionalsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 26, height: 26, border: "2px solid rgba(168,85,247,0.2)", borderTopColor: "#c084fc", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <ProfessionalsContent />
    </Suspense>
  );
}
