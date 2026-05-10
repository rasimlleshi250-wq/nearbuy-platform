"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

interface Professional {
  id: string;
  name: string;
  profession: string;
  city: string;
  photo?: string;
  verified: boolean;
  featured: boolean;
  pricePerHour?: number;
  experience?: string;
  description?: string;
  phone?: string;
  services?: string[];
}

const CITIES = ["Të gjitha", "Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Gjirokastër", "Sarandë"];
const PROFESSIONS = ["Të gjitha", "Elektriçist", "Hidraulik", "Rrobaqepës", "Mjek", "Avokat", "Arkitekt", "Inxhinier", "Mësues", "Kontabilist", "Tjetër"];

function ProfessionalsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("Të gjitha");
  const [profFilter, setProfFilter] = useState("Të gjitha");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(
          collection(db, "professionals"),
          where("verified", "==", true),
          orderBy("featured", "desc")
        );
        const snap = await getDocs(q);
        setProfessionals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Professional)));
      } catch (e) {
        // Provo pa orderBy nëse index mungon
        try {
          const q2 = query(collection(db, "professionals"), where("verified", "==", true));
          const snap2 = await getDocs(q2);
          setProfessionals(snap2.docs.map(d => ({ id: d.id, ...d.data() } as Professional)));
        } catch (e2) { console.error(e2); }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = professionals.filter(p => {
    const matchCity = cityFilter === "Të gjitha" || p.city === cityFilter;
    const matchProf = profFilter === "Të gjitha" || p.profession?.toLowerCase().includes(profFilter.toLowerCase());
    const matchSearch = !search.trim() ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.profession?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchProf && matchSearch;
  });

  return (
    <div className="pro-root">
      {/* Header */}
      <nav className="pro-nav">
        <Link href="/" className="pro-logo">Near<span>Buy</span>.al</Link>
        <div className="pro-nav-right">
          <Link href="/auth/login" className="pro-nav-login">Hyr</Link>
          <Link href="/auth/register" className="pro-nav-reg">Regjistrohu</Link>
        </div>
      </nav>

      <div className="pro-container">
        <div className="pro-page-header">
          <h1 className="pro-title">Profesionistë</h1>
          <p className="pro-sub">Gjej profesionistin e duhur afër teje</p>
        </div>

        {/* Filters */}
        <div className="pro-filters">
          <div className="pro-search-wrap">
            <svg className="pro-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Kërko profesionist..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pro-search-input"
            />
          </div>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="pro-select">
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={profFilter} onChange={e => setProfFilter(e.target.value)} className="pro-select">
            {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <p className="pro-count">{filtered.length} profesionistë gjithsej</p>

        {/* List */}
        {loading ? (
          <div className="pro-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="pro-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pro-empty">
            <span>👤</span>
            <p>Nuk u gjetën profesionistë për këtë kërkim.</p>
          </div>
        ) : (
          <div className="pro-grid">
            {filtered.map(p => (
              <div key={p.id} className={`pro-card ${p.featured ? "pro-card-featured" : ""}`}>
                {p.featured && <div className="pro-feat-badge">⭐ Featured</div>}
                <div className="pro-card-top">
                  <div className="pro-photo">
                    {p.photo ? <img src={p.photo} alt={p.name} /> : <span>👤</span>}
                  </div>
                  <div className="pro-card-info">
                    <p className="pro-name">{p.name}</p>
                    <p className="pro-profession">{p.profession}</p>
                    <p className="pro-city">📍 {p.city}</p>
                  </div>
                </div>

                {p.description && <p className="pro-desc">{p.description.slice(0, 100)}{p.description.length > 100 ? "..." : ""}</p>}

                <div className="pro-card-bottom">
                  {p.pricePerHour && (
                    <span className="pro-price">{p.pricePerHour.toLocaleString()} L/orë</span>
                  )}
                  {p.experience && (
                    <span className="pro-exp">🏅 {p.experience} vjet</span>
                  )}
                </div>

                {p.services && p.services.length > 0 && (
                  <div className="pro-services">
                    {p.services.slice(0, 3).map(s => (
                      <span key={s} className="pro-service-tag">{s}</span>
                    ))}
                    {p.services.length > 3 && <span className="pro-service-more">+{p.services.length - 3}</span>}
                  </div>
                )}

                {p.phone && (
                  <a href={`tel:${p.phone}`} className="pro-contact-btn">
                    📞 Kontakto
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .pro-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .pro-nav{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:60px;background:rgba(10,10,10,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .pro-logo{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.02em}
        .pro-logo span{color:#f5c842}
        .pro-nav-right{display:flex;align-items:center;gap:10px}
        .pro-nav-login{font-size:0.85rem;color:#a1a1aa;text-decoration:none;padding:0.4rem 0.8rem;transition:color .2s}
        .pro-nav-login:hover{color:#fff}
        .pro-nav-reg{font-size:0.85rem;font-weight:700;color:#0a0a0a;background:#f5c842;padding:0.4rem 1rem;border-radius:8px;text-decoration:none;transition:background .2s}
        .pro-nav-reg:hover{background:#e6b93a}
        .pro-container{max-width:1100px;margin:0 auto;padding:2rem 1.5rem}
        .pro-page-header{margin-bottom:1.75rem}
        .pro-title{font-size:1.75rem;font-weight:800;color:#fff;letter-spacing:-0.025em}
        .pro-sub{font-size:0.875rem;color:#71717a;margin-top:4px}
        .pro-filters{display:flex;gap:10px;margin-bottom:1rem;flex-wrap:wrap}
        .pro-search-wrap{position:relative;flex:1;min-width:200px}
        .pro-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none}
        .pro-search-input{width:100%;padding:0.65rem 0.9rem 0.65rem 2.25rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;outline:none;font-family:inherit;transition:border-color .2s}
        .pro-search-input:focus{border-color:rgba(192,132,252,0.4)}
        .pro-search-input::placeholder{color:#3f3f46}
        .pro-select{padding:0.65rem 0.9rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;outline:none;font-family:inherit;cursor:pointer;min-width:140px}
        .pro-select option{background:#1c1c1c}
        .pro-count{font-size:0.78rem;color:#52525b;margin-bottom:1.25rem}
        .pro-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
        .pro-skeleton{height:200px;background:rgba(255,255,255,0.04);border-radius:14px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .pro-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:4rem;color:#52525b;font-size:0.9rem;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.07);border-radius:14px;text-align:center}
        .pro-empty span{font-size:2.5rem}
        .pro-card{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px;transition:border-color .2s,transform .2s}
        .pro-card:hover{border-color:rgba(192,132,252,0.3);transform:translateY(-2px)}
        .pro-card-featured{border-color:rgba(192,132,252,0.25);background:rgba(192,132,252,0.03)}
        .pro-feat-badge{position:absolute;top:10px;right:10px;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(192,132,252,0.15);color:#c084fc;border:1px solid rgba(192,132,252,0.3)}
        .pro-card-top{display:flex;align-items:center;gap:12px}
        .pro-photo{width:50px;height:50px;border-radius:50%;background:rgba(192,132,252,0.1);border:1.5px solid rgba(192,132,252,0.2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;overflow:hidden;flex-shrink:0}
        .pro-photo img{width:100%;height:100%;object-fit:cover}
        .pro-name{font-size:0.95rem;font-weight:700;color:#f4f4f5}
        .pro-profession{font-size:0.78rem;color:#c084fc;font-weight:500}
        .pro-city{font-size:0.75rem;color:#52525b;margin-top:2px}
        .pro-desc{font-size:0.78rem;color:#71717a;line-height:1.5}
        .pro-card-bottom{display:flex;gap:10px;align-items:center}
        .pro-price{font-size:0.85rem;font-weight:700;color:#f5c842}
        .pro-exp{font-size:0.75rem;color:#71717a}
        .pro-services{display:flex;flex-wrap:wrap;gap:5px}
        .pro-service-tag{font-size:0.7rem;padding:2px 8px;background:rgba(192,132,252,0.08);border:1px solid rgba(192,132,252,0.15);border-radius:999px;color:#a78bfa}
        .pro-service-more{font-size:0.7rem;padding:2px 8px;color:#52525b}
        .pro-contact-btn{display:block;text-align:center;padding:0.6rem;background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.25);border-radius:10px;color:#c084fc;font-size:0.85rem;font-weight:600;text-decoration:none;transition:background .2s}
        .pro-contact-btn:hover{background:rgba(192,132,252,0.2)}
        @media(max-width:600px){.pro-nav{padding:0 1rem}.pro-filters{flex-direction:column}.pro-select{width:100%}}
      `}</style>
    </div>
  );
}

export default function ProfessionalsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(192,132,252,0.2)", borderTopColor: "#c084fc", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      </div>
    }>
      <ProfessionalsContent />
    </Suspense>
  );
}
