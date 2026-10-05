"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { trackContact } from "@/lib/firebase/analytics";
import { PROFESSIONS, normalizeProfession, getEffectiveProPlan } from "@/lib/proPlans";
import { openStatus, whatsappLink, DayHours } from "@/lib/businessInfo";
import JobRequestForm from "./JobRequestForm";

interface Professional {
  id: string;
  name: string;
  profession: string;
  city: string;
  zones?: string[];
  photo?: string;
  verified: boolean;
  featured: boolean;
  rank: number;
  pricePerHour?: number;
  experience?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  services?: string[];
  workPhotos?: string[];
  hours?: DayHours[];
  blocked?: boolean;
}

const ALL = "Të gjitha";
const CITIES = [ALL, "Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec", "Peshkopi"];

function ProfessionalsContent() {
  const searchParams = useSearchParams();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") || ALL);
  const [profFilter, setProfFilter] = useState(normalizeProfession(searchParams.get("profession")) || ALL);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  // Nga homepage: /professionals?request=1 hap direkt formën "Kërko mjeshtër"
  const [showForm, setShowForm] = useState(searchParams.get("request") === "1");

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, "professionals"), where("verified", "==", true)));
        const pros = snap.docs
          .map(d => {
            const raw = d.data();
            const plan = getEffectiveProPlan(raw);
            return { id: d.id, ...raw, profession: normalizeProfession(raw.profession), featured: plan.featured, rank: plan.rank } as Professional;
          })
          .filter(p => !p.blocked)
          // Premium të parët, pastaj Pro, pastaj ata me profil më të plotë
          .sort((a, b) => b.rank - a.rank || (b.workPhotos?.length || 0) - (a.workPhotos?.length || 0));
        setProfessionals(pros);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = professionals.filter(p => {
    const zones = p.zones && p.zones.length ? p.zones : [p.city];
    const matchCity = cityFilter === ALL || zones.includes(cityFilter);
    const matchProf = profFilter === ALL || p.profession === profFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || `${p.name} ${p.profession} ${zones.join(" ")} ${(p.services || []).join(" ")}`.toLowerCase().includes(q);
    return matchCity && matchProf && matchSearch;
  });

  return (
    <div className="pro-root">
      <nav className="pro-nav">
        <Link href="/" className="pro-logo">Near<span>Buy</span>.al</Link>
        <div className="pro-nav-right">
          <Link href="/search" className="pro-nav-link">Kërko</Link>
          <Link href="/auth/login" className="pro-nav-login">Hyr</Link>
          <Link href="/auth/register" className="pro-nav-reg">Regjistrohu</Link>
        </div>
      </nav>

      <div className="pro-container">
        <div className="pro-page-header">
          <div>
            <h1 className="pro-title">Profesionistë</h1>
            <p className="pro-sub">Gjej mjeshtrin e duhur afër teje, ose lër kërkesë dhe të kontaktojnë ata.</p>
          </div>
          <button className="pro-cta" onClick={() => setShowForm(s => !s)}>🛠 Kërko mjeshtër</button>
        </div>

        {showForm && (
          <div style={{ marginBottom: "1.25rem" }}>
            <JobRequestForm defaultProfession={profFilter !== ALL ? profFilter : ""} defaultCity={cityFilter !== ALL ? cityFilter : ""} onClose={() => setShowForm(false)} />
          </div>
        )}

        <div className="pro-filters">
          <div className="pro-search-wrap">
            <svg className="pro-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Kërko emër ose shërbim, p.sh. bojler..." value={search}
              onChange={e => setSearch(e.target.value)} className="pro-search-input" />
          </div>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="pro-select">
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={profFilter} onChange={e => setProfFilter(e.target.value)} className="pro-select">
            <option value={ALL}>{ALL}</option>
            {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <p className="pro-count">{filtered.length} profesionistë</p>

        {loading ? (
          <div className="pro-grid">{[...Array(6)].map((_, i) => <div key={i} className="pro-skeleton" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="pro-empty-wrap">
            <div className="pro-empty">
              <span>🛠</span>
              <p>S'ka ende mjeshtër për këtë kërkim. Lër kërkesën dhe të gjejmë ne.</p>
            </div>
            <JobRequestForm defaultProfession={profFilter !== ALL ? profFilter : ""} defaultCity={cityFilter !== ALL ? cityFilter : ""} />
          </div>
        ) : (
          <div className="pro-grid">
            {filtered.map(p => {
              const status = openStatus(p.hours);
              const wa = whatsappLink(p.whatsapp || p.phone, `Përshëndetje ${p.name}, ju gjeta në NearBuy.al. Kam nevojë për një ${p.profession.toLowerCase()}.`);
              const zones = p.zones && p.zones.length ? p.zones : [p.city];
              return (
                <div key={p.id} className={`pro-card ${p.featured ? "pro-card-featured" : ""}`}>
                  {p.featured && <div className="pro-feat-badge">⭐ Featured</div>}
                  <Link href={`/professionals/${p.id}`} className="pro-card-link">
                    <div className="pro-card-top">
                      <div className="pro-photo">{p.photo ? <img src={p.photo} alt={p.name} /> : <span>👤</span>}</div>
                      <div className="pro-card-info">
                        <p className="pro-name">{p.name}</p>
                        <p className="pro-profession">{p.profession}</p>
                        <p className="pro-city">📍 {zones.join(", ")}</p>
                      </div>
                    </div>
                    {status && <p className={`pro-open ${status.open ? "on" : ""}`}>● {status.label}</p>}
                    {p.workPhotos && p.workPhotos.length > 0 && (
                      <div className="pro-work">
                        {p.workPhotos.slice(0, 3).map(u => <img key={u} src={u} alt="punim" />)}
                      </div>
                    )}
                    {p.description && <p className="pro-desc">{p.description.slice(0, 100)}{p.description.length > 100 ? "..." : ""}</p>}
                    <div className="pro-card-bottom">
                      {p.pricePerHour && <span className="pro-price">{p.pricePerHour.toLocaleString()} L/orë</span>}
                      {p.experience && <span className="pro-exp">🏅 {p.experience}</span>}
                    </div>
                  </Link>
                  <div className="pro-btns">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="pro-wa" onClick={() => trackContact("professionals", p.id)}>💬 WhatsApp</a>}
                    {p.phone && <a href={`tel:${p.phone}`} className="pro-contact-btn" onClick={() => trackContact("professionals", p.id)}>📞 Telefono</a>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .pro-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .pro-nav{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:60px;background:rgba(10,10,10,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .pro-logo{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none}
        .pro-logo span{color:#f5c842}
        .pro-nav-right{display:flex;align-items:center;gap:10px}
        .pro-nav-link,.pro-nav-login{font-size:0.85rem;color:#a1a1aa;text-decoration:none;padding:0.4rem 0.8rem}
        .pro-nav-reg{font-size:0.85rem;font-weight:700;color:#0a0a0a;background:#f5c842;padding:0.4rem 1rem;border-radius:8px;text-decoration:none}
        .pro-container{max-width:1100px;margin:0 auto;padding:2rem 1.5rem}
        .pro-page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
        .pro-title{font-size:1.75rem;font-weight:800;color:#fff}
        .pro-sub{font-size:0.875rem;color:#71717a;margin-top:4px}
        .pro-cta{padding:0.7rem 1.3rem;background:#c084fc;color:#111;border:none;border-radius:12px;font-weight:700;font-size:0.9rem;cursor:pointer;font-family:inherit}
        .pro-filters{display:flex;gap:10px;margin-bottom:1rem;flex-wrap:wrap}
        .pro-search-wrap{position:relative;flex:1;min-width:200px}
        .pro-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none}
        .pro-search-input{width:100%;padding:0.65rem 0.9rem 0.65rem 2.25rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;outline:none;font-family:inherit}
        .pro-search-input::placeholder{color:#52525b}
        .pro-select{padding:0.65rem 0.9rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;outline:none;font-family:inherit;min-width:150px}
        .pro-select option{background:#1c1c1c}
        .pro-count{font-size:0.78rem;color:#52525b;margin-bottom:1.25rem}
        .pro-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
        .pro-skeleton{height:220px;background:rgba(255,255,255,0.04);border-radius:14px}
        .pro-empty-wrap{display:flex;flex-direction:column;gap:12px;max-width:640px}
        .pro-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:2rem;color:#71717a;font-size:0.9rem;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.08);border-radius:14px;text-align:center}
        .pro-empty span{font-size:2rem}
        .pro-card{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px}
        .pro-card:hover{border-color:rgba(192,132,252,0.3)}
        .pro-card-featured{border-color:rgba(245,200,66,0.3);background:rgba(245,200,66,0.03)}
        .pro-feat-badge{position:absolute;top:10px;right:10px;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(245,200,66,0.12);color:#f5c842;border:1px solid rgba(245,200,66,0.3)}
        .pro-card-link{text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:10px}
        .pro-card-top{display:flex;align-items:center;gap:12px}
        .pro-photo{width:52px;height:52px;border-radius:50%;background:rgba(192,132,252,0.1);border:1.5px solid rgba(192,132,252,0.2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;overflow:hidden;flex-shrink:0}
        .pro-photo img{width:100%;height:100%;object-fit:cover}
        .pro-name{font-size:0.95rem;font-weight:700;color:#f4f4f5}
        .pro-profession{font-size:0.8rem;color:#c084fc;font-weight:600}
        .pro-city{font-size:0.75rem;color:#71717a;margin-top:2px}
        .pro-open{font-size:0.75rem;color:#f87171;font-weight:600}
        .pro-open.on{color:#22c55e}
        .pro-work{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
        .pro-work img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px}
        .pro-desc{font-size:0.78rem;color:#a1a1aa;line-height:1.5}
        .pro-card-bottom{display:flex;gap:10px;align-items:center}
        .pro-price{font-size:0.85rem;font-weight:700;color:#f5c842}
        .pro-exp{font-size:0.75rem;color:#71717a}
        .pro-btns{display:flex;gap:6px;margin-top:auto}
        .pro-wa,.pro-contact-btn{flex:1;text-align:center;padding:0.6rem;border-radius:10px;font-size:0.85rem;font-weight:700;text-decoration:none}
        .pro-wa{background:#16a34a;color:#fff}
        .pro-contact-btn{background:rgba(192,132,252,0.12);border:1px solid rgba(192,132,252,0.3);color:#c084fc}
        @media(max-width:600px){.pro-nav{padding:0 1rem}.pro-filters{flex-direction:column}.pro-select{width:100%}.pro-cta{width:100%}}
      `}</style>
    </div>
  );
}

export default function ProfessionalsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0a" }} />}>
      <ProfessionalsContent />
    </Suspense>
  );
}
