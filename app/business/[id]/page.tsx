"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { trackView, trackContact, trackMapsClick } from "@/lib/firebase/analytics";

interface Business {
  id: string;
  name: string;
  city: string;
  category: string;
  address?: string;
  phone?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  schedule?: string;
  subscription: string;
  verified: boolean;
  featured: boolean;
  location?: { latitude: number; longitude: number };
}

interface Product {
  id: string;
  name: string;
  category: string;
  image?: string;
  price: number;
  inStock: boolean;
  offerPrice?: number;
  offerEnd?: string;
}

export default function BusinessPublicPage() {
  const params = useParams();
  const bizId = params.id as string;
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!bizId) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "businesses", bizId));
        if (!snap.exists() || !snap.data().verified) { setNotFound(true); setLoading(false); return; }
        const biz = { id: snap.id, ...snap.data() } as Business;
        setBusiness(biz);

        // Gjurmo shikimin
        trackView("businesses", bizId);

        // Ngarko produktet
        const pq = query(collection(db, "business_products"), where("businessId", "==", bizId));
        const psnap = await getDocs(pq);
        const prods: Product[] = [];
        for (const d of psnap.docs) {
          const data = d.data();
          let name = "", image = "", category = "";
          if (data.productId) {
            try {
              const ps = await getDoc(doc(db, "products", data.productId));
              if (ps.exists()) { name = ps.data().name; image = ps.data().images?.[0] || ""; category = ps.data().category; }
            } catch {}
          }
          if (data.inStock !== false) {
            prods.push({ id: d.id, name, image, category, price: data.price || 0, inStock: data.inStock ?? true, offerPrice: data.offerPrice || undefined, offerEnd: data.offerEnd || undefined });
          }
        }
        setProducts(prods);
      } catch (e) { console.error(e); setNotFound(true); }
      finally { setLoading(false); }
    };
    load();
  }, [bizId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:28px;height:28px;border:2px solid rgba(245,200,66,0.2);border-top-color:#f5c842;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound || !business) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", fontFamily: "system-ui" }}>
      <p style={{ fontSize: "3rem" }}>🏪</p>
      <p style={{ color: "#f4f4f5", fontSize: "1.1rem", fontWeight: 700 }}>Biznesi nuk u gjet</p>
      <Link href="/search" style={{ color: "#f5c842", fontSize: "0.875rem" }}>← Kthehu te kërkimi</Link>
    </div>
  );

  const planColor: Record<string, string> = { basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316", free: "#71717a" };
  const pc = planColor[business.subscription] || "#71717a";
  const hasOffers = products.some(p => p.offerPrice);
  const mapsUrl = business.location
    ? `https://www.google.com/maps?q=${business.location.latitude},${business.location.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(business.name + " " + business.city)}`;

  return (
    <div className="biz-pub-root">
      {/* Nav */}
      <nav className="biz-pub-nav">
        <Link href="/" className="biz-pub-logo">Near<span>Buy</span>.al</Link>
        <Link href="/search" className="biz-pub-back">← Kthehu</Link>
      </nav>

      {/* Cover */}
      <div className="biz-pub-cover">
        {business.coverImage
          ? <img src={business.coverImage} alt={business.name} className="biz-pub-cover-img" />
          : <div className="biz-pub-cover-placeholder" />
        }
        <div className="biz-pub-cover-overlay" />
      </div>

      <div className="biz-pub-container">

        {/* Header card */}
        <div className="biz-pub-header">
          <div className="biz-pub-header-left">
            <div className="biz-pub-logo-wrap">
              {business.logo ? <img src={business.logo} alt={business.name} /> : <span>🏪</span>}
            </div>
            <div>
              <div className="biz-pub-title-row">
                <h1 className="biz-pub-name">{business.name}</h1>
                {business.verified && <span className="biz-pub-verified">✓ Verifikuar</span>}
                {business.featured && <span className="biz-pub-featured">⭐ Featured</span>}
              </div>
              <p className="biz-pub-meta">{business.category} · 📍 {business.city}</p>
              {business.address && <p className="biz-pub-addr">🗺 {business.address}</p>}
            </div>
          </div>
          <div className="biz-pub-actions">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="biz-pub-call"
                onClick={() => trackContact("businesses", bizId)}>
                📞 {business.phone}
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="biz-pub-maps"
              onClick={() => trackMapsClick(bizId)}>
              🗺 Hap në Maps
            </a>
          </div>
        </div>

        {/* Info grid */}
        <div className="biz-pub-info-grid">
          {business.description && (
            <div className="biz-pub-card">
              <h2 className="biz-pub-card-title">Rreth nesh</h2>
              <p className="biz-pub-desc">{business.description}</p>
            </div>
          )}
          {business.schedule && (
            <div className="biz-pub-card">
              <h2 className="biz-pub-card-title">🕐 Orari i punës</h2>
              <div className="biz-pub-schedule">
                {business.schedule.split(", ").map((s, i) => {
                  const [day, hours] = s.split(": ");
                  return (
                    <div key={i} className="biz-pub-schedule-row">
                      <span className="biz-pub-day">{day}</span>
                      <span className="biz-pub-hours">{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Oferta aktive */}
        {hasOffers && (
          <>
            <h2 className="biz-pub-section-title">🏷 Ofertat aktive</h2>
            <div className="biz-pub-products-grid">
              {products.filter(p => p.offerPrice).map(p => (
                <div key={p.id} className="biz-pub-product biz-pub-product-offer">
                  <div className="biz-pub-offer-badge">OFERTË</div>
                  <div className="biz-pub-prod-img">
                    {p.image ? <img src={p.image} alt={p.name} /> : <span>📦</span>}
                  </div>
                  <div className="biz-pub-prod-info">
                    <p className="biz-pub-prod-name">{p.name}</p>
                    <p className="biz-pub-prod-cat">{p.category}</p>
                    <div className="biz-pub-prod-prices">
                      <span className="biz-pub-offer-price">{p.offerPrice?.toLocaleString()} L</span>
                      <span className="biz-pub-old-price">{p.price.toLocaleString()} L</span>
                      <span className="biz-pub-discount">-{Math.round((1 - (p.offerPrice || 0) / p.price) * 100)}%</span>
                    </div>
                    {p.offerEnd && <p className="biz-pub-offer-end">Deri më {p.offerEnd}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Të gjitha produktet */}
        {products.length > 0 && (
          <>
            <h2 className="biz-pub-section-title">🛍 Produktet</h2>
            <div className="biz-pub-products-grid">
              {products.map(p => (
                <div key={p.id} className="biz-pub-product">
                  <div className="biz-pub-prod-img">
                    {p.image ? <img src={p.image} alt={p.name} /> : <span>📦</span>}
                  </div>
                  <div className="biz-pub-prod-info">
                    <p className="biz-pub-prod-name">{p.name}</p>
                    <p className="biz-pub-prod-cat">{p.category}</p>
                    <div className="biz-pub-prod-prices">
                      {p.offerPrice ? (
                        <>
                          <span className="biz-pub-offer-price">{p.offerPrice.toLocaleString()} L</span>
                          <span className="biz-pub-old-price">{p.price.toLocaleString()} L</span>
                        </>
                      ) : (
                        <span className="biz-pub-price">{p.price.toLocaleString()} L</span>
                      )}
                    </div>
                    <span className={`biz-pub-stock ${p.inStock ? "in" : "out"}`}>
                      {p.inStock ? "✓ Në stok" : "✗ Jashtë stoku"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Harta */}
        {business.location && (
          <>
            <h2 className="biz-pub-section-title">📍 Lokacioni</h2>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="biz-pub-map-card"
              onClick={() => trackMapsClick(bizId)}>
              <div className="biz-pub-map-preview">
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${business.location.latitude},${business.location.longitude}&zoom=15&size=800x200&markers=color:red%7C${business.location.latitude},${business.location.longitude}&key=AIzaSyA0nJG2i_fNhef5C1dZu7_Bkj1CpMoFzmQ`}
                  alt="Harta"
                  className="biz-pub-map-img"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="biz-pub-map-overlay">
                  <span>🗺 Hap në Google Maps →</span>
                </div>
              </div>
              <p className="biz-pub-map-addr">{business.address}, {business.city}</p>
            </a>
          </>
        )}

      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .biz-pub-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .biz-pub-nav{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:60px;background:rgba(10,10,10,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .biz-pub-logo{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.02em}
        .biz-pub-logo span{color:#f5c842}
        .biz-pub-back{font-size:0.85rem;color:#a1a1aa;text-decoration:none;transition:color .2s}
        .biz-pub-back:hover{color:#fff}
        .biz-pub-cover{height:200px;position:relative;overflow:hidden;background:#111}
        .biz-pub-cover-img{width:100%;height:100%;object-fit:cover}
        .biz-pub-cover-placeholder{width:100%;height:100%;background:linear-gradient(135deg,#1a1a1a 0%,#0f0f0f 100%)}
        .biz-pub-cover-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(10,10,10,0.8) 100%)}
        .biz-pub-container{max-width:900px;margin:0 auto;padding:1.5rem;display:flex;flex-direction:column;gap:1.5rem}
        .biz-pub-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:1.5rem;flex-wrap:wrap}
        .biz-pub-header-left{display:flex;align-items:flex-start;gap:16px}
        .biz-pub-logo-wrap{width:72px;height:72px;border-radius:16px;background:rgba(249,115,22,0.1);border:2px solid rgba(249,115,22,0.2);display:flex;align-items:center;justify-content:center;font-size:2rem;overflow:hidden;flex-shrink:0}
        .biz-pub-logo-wrap img{width:100%;height:100%;object-fit:cover}
        .biz-pub-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
        .biz-pub-name{font-size:1.4rem;font-weight:800;color:#fff;letter-spacing:-0.025em}
        .biz-pub-verified{font-size:0.72rem;font-weight:600;color:#22c55e;background:rgba(34,197,94,0.1);padding:3px 8px;border-radius:6px;border:1px solid rgba(34,197,94,0.2)}
        .biz-pub-featured{font-size:0.72rem;font-weight:600;color:#f5c842;background:rgba(245,200,66,0.1);padding:3px 8px;border-radius:6px;border:1px solid rgba(245,200,66,0.2)}
        .biz-pub-meta{font-size:0.875rem;color:#71717a;margin-bottom:4px}
        .biz-pub-addr{font-size:0.8rem;color:#52525b}
        .biz-pub-actions{display:flex;flex-direction:column;gap:8px;flex-shrink:0}
        .biz-pub-call{display:block;padding:0.65rem 1.25rem;background:#f97316;color:#fff;font-size:0.875rem;font-weight:700;border-radius:10px;text-decoration:none;text-align:center;transition:background .2s}
        .biz-pub-call:hover{background:#ea6c0a}
        .biz-pub-maps{display:block;padding:0.65rem 1.25rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;font-size:0.875rem;font-weight:500;border-radius:10px;text-decoration:none;text-align:center;transition:all .2s}
        .biz-pub-maps:hover{border-color:rgba(255,255,255,0.2);color:#fff}
        .biz-pub-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .biz-pub-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem}
        .biz-pub-card-title{font-size:0.875rem;font-weight:700;color:#e4e4e7;margin-bottom:0.75rem}
        .biz-pub-desc{font-size:0.875rem;color:#a1a1aa;line-height:1.6}
        .biz-pub-schedule{display:flex;flex-direction:column;gap:6px}
        .biz-pub-schedule-row{display:flex;justify-content:space-between;align-items:center;font-size:0.82rem}
        .biz-pub-day{color:#a1a1aa;font-weight:500}
        .biz-pub-hours{color:#e4e4e7;font-weight:600}
        .biz-pub-section-title{font-size:1rem;font-weight:700;color:#fff;letter-spacing:-0.01em}
        .biz-pub-products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
        .biz-pub-product{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;transition:border-color .2s,transform .2s;position:relative}
        .biz-pub-product:hover{border-color:rgba(249,115,22,0.3);transform:translateY(-2px)}
        .biz-pub-product-offer{border-color:rgba(245,200,66,0.2);background:rgba(245,200,66,0.02)}
        .biz-pub-offer-badge{position:absolute;top:8px;left:8px;background:#f5c842;color:#0a0a0a;font-size:0.65rem;font-weight:800;padding:3px 8px;border-radius:4px;letter-spacing:0.05em}
        .biz-pub-prod-img{height:120px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;font-size:2rem;overflow:hidden}
        .biz-pub-prod-img img{width:100%;height:100%;object-fit:cover}
        .biz-pub-prod-info{padding:0.75rem}
        .biz-pub-prod-name{font-size:0.82rem;font-weight:600;color:#e4e4e7;margin-bottom:2px}
        .biz-pub-prod-cat{font-size:0.72rem;color:#71717a;margin-bottom:8px}
        .biz-pub-prod-prices{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px}
        .biz-pub-price{font-size:0.9rem;font-weight:700;color:#f97316}
        .biz-pub-offer-price{font-size:0.9rem;font-weight:700;color:#f5c842}
        .biz-pub-old-price{font-size:0.75rem;color:#52525b;text-decoration:line-through}
        .biz-pub-discount{font-size:0.7rem;font-weight:700;color:#22c55e;background:rgba(34,197,94,0.1);padding:1px 6px;border-radius:4px}
        .biz-pub-offer-end{font-size:0.7rem;color:#71717a}
        .biz-pub-stock{font-size:0.7rem;font-weight:600;padding:2px 7px;border-radius:4px}
        .biz-pub-stock.in{background:rgba(34,197,94,0.1);color:#22c55e}
        .biz-pub-stock.out{background:rgba(239,68,68,0.1);color:#f87171}
        .biz-pub-map-card{display:block;text-decoration:none;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);transition:border-color .2s}
        .biz-pub-map-card:hover{border-color:rgba(245,200,66,0.3)}
        .biz-pub-map-preview{position:relative;height:180px;background:#111;overflow:hidden}
        .biz-pub-map-img{width:100%;height:100%;object-fit:cover}
        .biz-pub-map-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#f5c842;font-size:0.9rem;font-weight:600}
        .biz-pub-map-addr{padding:0.75rem 1rem;font-size:0.82rem;color:#71717a;background:rgba(255,255,255,0.03)}
        @media(max-width:640px){.biz-pub-nav{padding:0 1rem}.biz-pub-header{flex-direction:column}.biz-pub-actions{flex-direction:row;width:100%}.biz-pub-call,.biz-pub-maps{flex:1}.biz-pub-info-grid{grid-template-columns:1fr}.biz-pub-products-grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </div>
  );
}
