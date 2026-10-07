"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { trackView, trackContact } from "@/lib/firebase/analytics";
import { normalizeProfession, getEffectiveProPlan } from "@/lib/proPlans";
import { DAYS, DayHours, isValidHours, openStatus, whatsappLink } from "@/lib/businessInfo";

interface Professional {
  id: string;
  name: string;
  profession: string;
  description?: string;
  services?: string[];
  city: string;
  zones?: string[];
  address?: string;
  phone: string;
  whatsapp?: string;
  photo?: string;
  workPhotos?: string[];
  pricePerHour?: number;
  experience?: string;
  schedule?: string;
  hours?: DayHours[];
  verified: boolean;
  featured: boolean;
  blocked?: boolean;
}

export default function ProfessionalPublicPage() {
  const params = useParams();
  const proId = params.id as string;
  const [pro, setPro] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bigPhoto, setBigPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!proId) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "professionals", proId));
        if (!snap.exists() || !snap.data().verified || snap.data().blocked) { setNotFound(true); return; }
        const raw = snap.data();
        const plan = getEffectiveProPlan(raw);
        setPro({ id: snap.id, ...raw, profession: normalizeProfession(raw.profession), featured: plan.featured } as Professional);
        trackView("professionals", proId);
      } catch (e) { console.error(e); setNotFound(true); }
      finally { setLoading(false); }
    };
    load();
  }, [proId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:28px;height:28px;border:2px solid rgba(192,132,252,0.2);border-top-color:#c084fc;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound || !pro) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", color: "#71717a" }}>
      <p style={{ fontSize: "3rem" }}>😕</p>
      <p>Profesionisti nuk u gjet.</p>
      <Link href="/professionals" style={{ color: "#c084fc", textDecoration: "none", fontSize: "0.875rem" }}>← Kthehu te lista</Link>
    </div>
  );

  const contact = () => trackContact("professionals", proId);
  const firstName = pro.name?.split(" ")[0] || "";
  const zones = pro.zones && pro.zones.length ? pro.zones : [pro.city];
  const status = openStatus(pro.hours);
  const wa = whatsappLink(pro.whatsapp || pro.phone,
    `Përshëndetje ${firstName}, ju gjeta në NearBuy.al. Kam nevojë për një ${pro.profession.toLowerCase()} në ${zones[0]}.`);

  const Buttons = ({ big }: { big?: boolean }) => (
    <div className={`pub-contact-btns ${big ? "row" : ""}`}>
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="pub-btn-whatsapp" onClick={contact}>💬 WhatsApp</a>}
      <a href={`tel:${pro.phone}`} className="pub-btn-call" onClick={contact}>📞 {big ? "Telefono" : pro.phone}</a>
    </div>
  );

  return (
    <main className="pub-root">
      <div className="pub-bg" />
      <div className="pub-wrap">
        <div className="pub-nav">
          <Link href="/" className="pub-brand">NearBuy<em>.al</em></Link>
          <Link href="/professionals" className="pub-back">← Profesionistët</Link>
        </div>

        <div className="pub-hero">
          <div className="pub-hero-left">
            <div className="pub-avatar">
              {pro.photo ? <img src={pro.photo} alt={pro.name} />
                : <span>{pro.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</span>}
            </div>
            <div className="pub-hero-info">
              <div className="pub-hero-top">
                <h1>{pro.name}</h1>
                <span className="pub-verified">✓ Verifikuar</span>
                {pro.featured && <span className="pub-featured-badge">⭐ I rekomanduar</span>}
              </div>
              <p className="pub-profession">{pro.profession}</p>
              {status && <p className={`pub-open ${status.open ? "on" : ""}`}>● {status.label}</p>}
              <div className="pub-meta-row">
                <span className="pub-meta-item">📍 Punon në: {zones.join(", ")}</span>
                {pro.pricePerHour && <span className="pub-meta-item">💰 {pro.pricePerHour.toLocaleString()} L/orë</span>}
                {pro.experience && <span className="pub-meta-item">⏱ {pro.experience}</span>}
              </div>
            </div>
          </div>
          <Buttons />
        </div>

        <div className="pub-content">
          {pro.workPhotos && pro.workPhotos.length > 0 && (
            <div className="pub-card">
              <h2 className="pub-card-title">Punimet ({pro.workPhotos.length})</h2>
              <div className="pub-gallery">
                {pro.workPhotos.map((u, i) => (
                  <button key={u} className="pub-gallery-item" onClick={() => setBigPhoto(u)}>
                    <img src={u} alt={`Punim ${i + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {pro.description && (
            <div className="pub-card">
              <h2 className="pub-card-title">Rreth meje</h2>
              <p className="pub-desc">{pro.description}</p>
            </div>
          )}

          {pro.services && pro.services.length > 0 && (
            <div className="pub-card">
              <h2 className="pub-card-title">Shërbimet</h2>
              <div className="pub-services">{pro.services.map((s, i) => <span key={i} className="pub-service-tag">{s}</span>)}</div>
            </div>
          )}

          {isValidHours(pro.hours) ? (
            <div className="pub-card">
              <h2 className="pub-card-title">Orari</h2>
              <div className="pub-hours">
                {pro.hours.map((d, i) => (
                  <div key={i} className="pub-hour"><span>{DAYS[i]}</span><span>{d.closed ? "Pushim" : `${d.open} – ${d.close}`}</span></div>
                ))}
              </div>
            </div>
          ) : pro.schedule ? (
            <div className="pub-card"><h2 className="pub-card-title">Orari</h2><p className="pub-desc">{pro.schedule}</p></div>
          ) : null}

          <div className="pub-cta-card">
            <div>
              <p className="pub-cta-title">Keni nevojë për {pro.profession.toLowerCase()}?</p>
              <p className="pub-cta-sub">Kontaktoni {firstName} direkt — përmendni që e gjetët në NearBuy.</p>
            </div>
            <Buttons big />
          </div>
        </div>
      </div>

      {bigPhoto && (
        <div className="pub-lightbox" onClick={() => setBigPhoto(null)}>
          <img src={bigPhoto} alt="Punim" />
          <span>✕ Mbyll</span>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .pub-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4;position:relative}
        .pub-bg{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 0%,rgba(192,132,252,0.08) 0%,transparent 60%);pointer-events:none;z-index:0}
        .pub-wrap{position:relative;z-index:1;max-width:820px;margin:0 auto;padding:1.5rem}
        .pub-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem}
        .pub-brand{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none}
        .pub-brand em{color:#f5c842;font-style:normal}
        .pub-back{font-size:0.82rem;color:#71717a;text-decoration:none}
        .pub-hero{background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:1.75rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;margin-bottom:1.25rem;flex-wrap:wrap}
        .pub-hero-left{display:flex;align-items:flex-start;gap:16px;flex:1;min-width:0}
        .pub-avatar{width:80px;height:80px;border-radius:50%;background:rgba(192,132,252,0.15);border:2px solid rgba(192,132,252,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;font-size:1.4rem;font-weight:700;color:#c084fc}
        .pub-avatar img{width:100%;height:100%;object-fit:cover}
        .pub-hero-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
        .pub-hero-info h1{font-size:1.35rem;font-weight:700;color:#fff}
        .pub-verified{font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .pub-featured-badge{font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(245,200,66,0.12);color:#f5c842;border:1px solid rgba(245,200,66,0.25)}
        .pub-profession{font-size:0.9rem;color:#f97316;font-weight:600;margin-bottom:6px}
        .pub-open{font-size:0.8rem;font-weight:600;color:#f87171;margin-bottom:8px}
        .pub-open.on{color:#22c55e}
        .pub-meta-row{display:flex;flex-wrap:wrap;gap:10px}
        .pub-meta-item{font-size:0.8rem;color:#a1a1aa}
        .pub-contact-btns{display:flex;flex-direction:column;gap:8px;flex-shrink:0}
        .pub-contact-btns.row{flex-direction:row;flex-wrap:wrap}
        .pub-btn-call,.pub-btn-whatsapp{display:flex;align-items:center;justify-content:center;gap:8px;padding:0.7rem 1.3rem;border-radius:10px;font-size:0.9rem;font-weight:700;text-decoration:none;white-space:nowrap}
        .pub-btn-whatsapp{background:#16a34a;color:#fff}
        .pub-btn-call{background:rgba(192,132,252,0.12);border:1px solid rgba(192,132,252,0.3);color:#c084fc}
        .pub-content{display:flex;flex-direction:column;gap:1.25rem}
        .pub-card{background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.5rem}
        .pub-card-title{font-size:0.85rem;font-weight:700;color:#e4e4e7;margin-bottom:1rem;text-transform:uppercase;letter-spacing:0.04em}
        .pub-desc{font-size:0.9rem;color:#a1a1aa;line-height:1.7}
        .pub-services{display:flex;flex-wrap:wrap;gap:8px}
        .pub-service-tag{background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.2);border-radius:999px;padding:5px 14px;font-size:0.8rem;color:#c084fc}
        .pub-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
        .pub-gallery-item{border:none;padding:0;background:none;cursor:zoom-in;border-radius:10px;overflow:hidden;aspect-ratio:1}
        .pub-gallery-item img{width:100%;height:100%;object-fit:cover;display:block}
        .pub-hours{display:flex;flex-direction:column}
        .pub-hour{display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem;color:#a1a1aa}
        .pub-hour:last-child{border-bottom:none}
        .pub-cta-card{background:rgba(192,132,252,0.05);border:1px solid rgba(192,132,252,0.18);border-radius:14px;padding:1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap}
        .pub-cta-title{font-size:1rem;font-weight:700;color:#fff;margin-bottom:4px}
        .pub-cta-sub{font-size:0.82rem;color:#a1a1aa}
        .pub-lightbox{position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:zoom-out;padding:1rem}
        .pub-lightbox img{max-width:100%;max-height:85vh;border-radius:10px}
        .pub-lightbox span{color:#a1a1aa;font-size:0.85rem}
        @media(max-width:600px){.pub-hero{flex-direction:column}.pub-contact-btns{flex-direction:row;flex-wrap:wrap;width:100%}.pub-contact-btns a{flex:1}.pub-cta-card{flex-direction:column;align-items:flex-start}}
      `}</style>
    </main>
  );
}
