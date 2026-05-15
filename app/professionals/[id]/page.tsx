"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { trackView, trackContact } from "@/lib/firebase/analytics";

interface Professional {
  id: string;
  name: string;
  profession: string;
  description?: string;
  services: string[];
  city: string;
  address?: string;
  phone: string;
  email?: string;
  photo?: string;
  pricePerHour?: number;
  experience?: string;
  schedule?: string;
  availability?: string;
  verified: boolean;
  featured: boolean;
  rating?: number;
  reviewCount?: number;
}

export default function ProfessionalPublicPage() {
  const params = useParams();
  const proId = params.id as string;
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!proId) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "professionals", proId));
        if (!snap.exists() || !snap.data().verified) { setNotFound(true); setLoading(false); return; }
        const pro = { id: snap.id, ...snap.data() } as Professional;
        setProfessional(pro);
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

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", color: "#71717a" }}>
      <p style={{ fontSize: "3rem" }}>😕</p>
      <p style={{ fontSize: "1rem" }}>Profesionisti nuk u gjet.</p>
      <Link href="/professionals" style={{ color: "#c084fc", textDecoration: "none", fontSize: "0.875rem" }}>← Kthehu te lista</Link>
    </div>
  );

  if (!professional) return null;

  const handleContact = () => {
    trackContact("professionals", proId);
  };

  const whatsappNum = professional.phone?.replace(/\s+/g, "").replace("+", "");

  return (
    <main className="pub-root">
      <div className="pub-bg" />

      <div className="pub-wrap">
        {/* Header nav */}
        <div className="pub-nav">
          <Link href="/" className="pub-brand">NearBuy<em>.al</em></Link>
          <Link href="/professionals" className="pub-back">← Profesionistët</Link>
        </div>

        {/* Hero card */}
        <div className="pub-hero">
          <div className="pub-hero-left">
            <div className="pub-avatar">
              {professional.photo
                ? <img src={professional.photo} alt={professional.name} />
                : <span>{professional.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</span>
              }
            </div>
            <div className="pub-hero-info">
              <div className="pub-hero-top">
                <h1>{professional.name}</h1>
                {professional.featured && <span className="pub-featured-badge">⭐ Featured</span>}
              </div>
              <p className="pub-profession">{professional.profession}</p>
              <div className="pub-meta-row">
                <span className="pub-meta-item">📍 {professional.city}</span>
                {professional.pricePerHour && (
                  <span className="pub-meta-item">💰 {professional.pricePerHour.toLocaleString()} L/orë</span>
                )}
                {professional.experience && (
                  <span className="pub-meta-item">⏱ {professional.experience} eksperiencë</span>
                )}
              </div>
            </div>
          </div>

          <div className="pub-contact-btns">
            <a href={`tel:${professional.phone}`} className="pub-btn-call" onClick={handleContact}>
              📞 {professional.phone}
            </a>
            {whatsappNum && (
              <a href={`https://wa.me/${whatsappNum}`} target="_blank" rel="noopener noreferrer"
                className="pub-btn-whatsapp" onClick={handleContact}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            )}
          </div>
        </div>

        <div className="pub-content">
          {/* Pershkrimi */}
          {professional.description && (
            <div className="pub-card">
              <h2 className="pub-card-title">Rreth meje</h2>
              <p className="pub-desc">{professional.description}</p>
            </div>
          )}

          {/* Sherbimet */}
          {professional.services && professional.services.length > 0 && (
            <div className="pub-card">
              <h2 className="pub-card-title">Shërbimet</h2>
              <div className="pub-services">
                {professional.services.map((s, i) => (
                  <span key={i} className="pub-service-tag">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Info shtese */}
          <div className="pub-card">
            <h2 className="pub-card-title">Informacion</h2>
            <div className="pub-info-grid">
              <div className="pub-info-item">
                <span className="pub-info-label">Qyteti</span>
                <span className="pub-info-val">📍 {professional.city}</span>
              </div>
              {professional.address && (
                <div className="pub-info-item">
                  <span className="pub-info-label">Adresa</span>
                  <span className="pub-info-val">{professional.address}</span>
                </div>
              )}
              {professional.pricePerHour && (
                <div className="pub-info-item">
                  <span className="pub-info-label">Tarifa</span>
                  <span className="pub-info-val">💰 {professional.pricePerHour.toLocaleString()} L/orë</span>
                </div>
              )}
              {professional.experience && (
                <div className="pub-info-item">
                  <span className="pub-info-label">Eksperienca</span>
                  <span className="pub-info-val">⏱ {professional.experience}</span>
                </div>
              )}
              {professional.schedule && (
                <div className="pub-info-item">
                  <span className="pub-info-label">Orari</span>
                  <span className="pub-info-val">🕐 {professional.schedule}</span>
                </div>
              )}
              {professional.availability && (
                <div className="pub-info-item">
                  <span className="pub-info-label">Disponueshmëria</span>
                  <span className="pub-info-val">✅ {professional.availability}</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA kontakt */}
          <div className="pub-cta-card">
            <div>
              <p className="pub-cta-title">Keni nevojë për {professional.profession}?</p>
              <p className="pub-cta-sub">Kontaktoni {professional.name?.split(" ")[0]} direkt</p>
            </div>
            <div className="pub-contact-btns">
              <a href={`tel:${professional.phone}`} className="pub-btn-call" onClick={handleContact}>
                📞 Telefono
              </a>
              {whatsappNum && (
                <a href={`https://wa.me/${whatsappNum}`} target="_blank" rel="noopener noreferrer"
                  className="pub-btn-whatsapp" onClick={handleContact}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .pub-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4;position:relative}
        .pub-bg{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 0%,rgba(192,132,252,0.08) 0%,transparent 60%);pointer-events:none;z-index:0}
        .pub-wrap{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:1.5rem}
        .pub-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem}
        .pub-brand{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.02em}
        .pub-brand em{color:#f5c842;font-style:normal}
        .pub-back{font-size:0.82rem;color:#71717a;text-decoration:none;transition:color .2s}
        .pub-back:hover{color:#c084fc}
        .pub-hero{background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:1.75rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;margin-bottom:1.25rem;flex-wrap:wrap}
        .pub-hero-left{display:flex;align-items:flex-start;gap:16px;flex:1;min-width:0}
        .pub-avatar{width:72px;height:72px;border-radius:50%;background:rgba(192,132,252,0.15);border:2px solid rgba(192,132,252,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;font-size:1.4rem;font-weight:700;color:#c084fc}
        .pub-avatar img{width:100%;height:100%;object-fit:cover}
        .pub-hero-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px}
        .pub-hero-info h1{font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:-0.02em}
        .pub-featured-badge{font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(245,200,66,0.12);color:#f5c842;border:1px solid rgba(245,200,66,0.25)}
        .pub-profession{font-size:0.875rem;color:#f97316;font-weight:600;margin-bottom:10px}
        .pub-meta-row{display:flex;flex-wrap:wrap;gap:10px}
        .pub-meta-item{font-size:0.78rem;color:#71717a}
        .pub-contact-btns{display:flex;flex-direction:column;gap:8px;flex-shrink:0}
        .pub-btn-call{display:flex;align-items:center;gap:8px;padding:0.65rem 1.25rem;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:10px;color:#4ade80;font-size:0.875rem;font-weight:600;text-decoration:none;white-space:nowrap;transition:background .2s}
        .pub-btn-call:hover{background:rgba(34,197,94,0.18)}
        .pub-btn-whatsapp{display:flex;align-items:center;gap:8px;padding:0.65rem 1.25rem;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25);border-radius:10px;color:#25d366;font-size:0.875rem;font-weight:600;text-decoration:none;white-space:nowrap;transition:background .2s}
        .pub-btn-whatsapp:hover{background:rgba(37,211,102,0.18)}
        .pub-content{display:flex;flex-direction:column;gap:1.25rem}
        .pub-card{background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.5rem}
        .pub-card-title{font-size:0.9rem;font-weight:700;color:#e4e4e7;margin-bottom:1rem;text-transform:uppercase;letter-spacing:0.04em}
        .pub-desc{font-size:0.875rem;color:#a1a1aa;line-height:1.7}
        .pub-services{display:flex;flex-wrap:wrap;gap:8px}
        .pub-service-tag{background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.2);border-radius:999px;padding:5px 14px;font-size:0.8rem;color:#c084fc}
        .pub-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
        .pub-info-item{padding:0.65rem 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;gap:1rem}
        .pub-info-item:nth-last-child(-n+2){border-bottom:none}
        .pub-info-label{font-size:0.78rem;color:#52525b;font-weight:500}
        .pub-info-val{font-size:0.82rem;color:#a1a1aa;text-align:right}
        .pub-cta-card{background:rgba(192,132,252,0.05);border:1px solid rgba(192,132,252,0.15);border-radius:14px;padding:1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap}
        .pub-cta-title{font-size:0.95rem;font-weight:700;color:#fff;margin-bottom:4px}
        .pub-cta-sub{font-size:0.8rem;color:#71717a}
        .pub-cta-card .pub-contact-btns{flex-direction:row}
        @media(max-width:600px){.pub-hero{flex-direction:column}.pub-contact-btns{flex-direction:row;flex-wrap:wrap}.pub-cta-card{flex-direction:column;align-items:flex-start}.pub-info-grid{grid-template-columns:1fr}.pub-info-item:last-child{border-bottom:none}}
      `}</style>
    </main>
  );
}
