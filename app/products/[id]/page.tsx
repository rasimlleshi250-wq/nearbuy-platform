"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { trackProductClick } from "@/lib/firebase/analytics";

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  images?: string[];
  brand?: string;
  description?: string;
  tags?: string[];
  barcode?: string;
}

interface BusinessProduct {
  id: string;
  businessId: string;
  price: number;
  inStock: boolean;
  hasOffer?: boolean;
  offerPrice?: number;
  offerEnd?: string;
  featured?: boolean;
}

interface Business {
  id: string;
  name: string;
  city: string;
  phone: string;
  logo?: string;
  verified: boolean;
  address?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [bizProducts, setBizProducts] = useState<(BusinessProduct & { business: Business })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const load = async () => {
      try {
        // Ngarko produktin
        const pSnap = await getDoc(doc(db, "products", productId));
        if (!pSnap.exists()) { setNotFound(true); setLoading(false); return; }
        const prod = { id: pSnap.id, ...pSnap.data() } as Product;
        setProduct(prod);

        // Ngarko bizneset qe e shesin
        const bpQ = query(collection(db, "business_products"), where("productId", "==", productId));
        const bpSnap = await getDocs(bpQ);
        const bpList = bpSnap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProduct));

        // Ngarko te dhenat e bizneseve
        const results: (BusinessProduct & { business: Business })[] = [];
        for (const bp of bpList) {
          try {
            const bSnap = await getDoc(doc(db, "businesses", bp.businessId));
            if (bSnap.exists() && bSnap.data().verified) {
              results.push({ ...bp, business: { id: bSnap.id, ...bSnap.data() } as Business });
            }
          } catch {}
        }
        // Sorto: ofertat para, pastaj me stok, pastaj sipas cmimit
        results.sort((a, b) => {
          if (a.hasOffer && !b.hasOffer) return -1;
          if (!a.hasOffer && b.hasOffer) return 1;
          if (a.inStock && !b.inStock) return -1;
          if (!a.inStock && b.inStock) return 1;
          return (a.price || 0) - (b.price || 0);
        });
        setBizProducts(results);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [productId]);

  const handleContactClick = (businessId: string) => {
    if (product) trackProductClick(businessId, productId, product.name);
  };

  const isOfferActive = (offerEnd?: string) => {
    if (!offerEnd) return false;
    return new Date(offerEnd) > new Date();
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:28px;height:28px;border:2px solid rgba(245,200,66,0.2);border-top-color:#f5c842;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound || !product) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", color: "#71717a" }}>
      <p style={{ fontSize: "3rem" }}>📦</p>
      <p>Produkti nuk u gjet.</p>
      <Link href="/products" style={{ color: "#f5c842", textDecoration: "none", fontSize: "0.875rem" }}>← Kthehu te produktet</Link>
    </div>
  );

  const lowestPrice = bizProducts.filter(b => b.inStock).reduce((min, b) => {
    const p = b.hasOffer && isOfferActive(b.offerEnd) ? b.offerPrice || b.price : b.price;
    return p < min ? p : min;
  }, Infinity);

  return (
    <main className="det-root">
      <div className="det-bg" />
      <div className="det-wrap">

        {/* Nav */}
        <nav className="det-nav">
          <Link href="/" className="det-brand">Near<span>Buy</span>.al</Link>
          <div className="det-breadcrumb">
            <Link href="/products">Produktet</Link>
            <span>›</span>
            <Link href={`/products?category=${product.category}`}>{product.category}</Link>
            <span>›</span>
            <span>{product.name}</span>
          </div>
        </nav>

        {/* Main content */}
        <div className="det-main">
          {/* Left: foto */}
          <div className="det-photos">
            <div className="det-img-main">
              {product.images && product.images.length > 0
                ? <img src={product.images[activeImg]} alt={product.name} />
                : <span className="det-no-img">📦</span>
              }
            </div>
            {product.images && product.images.length > 1 && (
              <div className="det-thumbs">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`det-thumb ${activeImg === i ? "active" : ""}`}>
                    <img src={img} alt={`foto ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: info */}
          <div className="det-info">
            <div className="det-badges">
              <span className="det-cat-badge">{product.category}</span>
              {product.subcategory && <span className="det-subcat-badge">{product.subcategory}</span>}
            </div>
            <h1 className="det-title">{product.name}</h1>
            {product.brand && <p className="det-brand">Marka: <strong>{product.brand}</strong></p>}

            {lowestPrice !== Infinity && (
              <div className="det-price-row">
                <span className="det-price-label">Nga</span>
                <span className="det-price">{lowestPrice.toLocaleString()} L</span>
                <span className="det-price-sub">/ në dyqane lokale</span>
              </div>
            )}

            {product.description && (
              <div className="det-desc">
                <h3>Përshkrimi</h3>
                <p>{product.description}</p>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="det-tags">
                {product.tags.map(t => <span key={t} className="det-tag">{t}</span>)}
              </div>
            )}

            {product.barcode && (
              <p className="det-barcode">Barkodi: <code>{product.barcode}</code></p>
            )}
          </div>
        </div>

        {/* Bizneset qe e shesin */}
        <div className="det-biz-section">
          <h2 className="det-section-title">
            🏪 Dyqanet që e shesin këtë produkt
            <span className="det-biz-count">{bizProducts.length} dyqane</span>
          </h2>

          {bizProducts.length === 0 ? (
            <div className="det-no-biz">
              <p>😕 Asnjë dyqan nuk e shet ende këtë produkt.</p>
              <Link href="/search" className="det-search-link">Kërko dyqane →</Link>
            </div>
          ) : (
            <div className="det-biz-grid">
              {bizProducts.map(bp => {
                const hasActiveOffer = bp.hasOffer && isOfferActive(bp.offerEnd);
                const displayPrice = hasActiveOffer ? bp.offerPrice || bp.price : bp.price;
                return (
                  <div key={bp.id} className={`det-biz-card ${!bp.inStock ? "out-of-stock" : ""} ${bp.featured ? "featured" : ""}`}>
                    {bp.featured && <span className="det-featured-tag">⭐ Featured</span>}
                    {hasActiveOffer && (
                      <span className="det-offer-tag">
                        🏷 -{Math.round((1 - (bp.offerPrice || bp.price) / bp.price) * 100)}%
                      </span>
                    )}
                    <div className="det-biz-left">
                      <div className="det-biz-logo">
                        {bp.business.logo
                          ? <img src={bp.business.logo} alt={bp.business.name} />
                          : <span>🏪</span>
                        }
                      </div>
                      <div>
                        <p className="det-biz-name">{bp.business.name}</p>
                        <p className="det-biz-city">📍 {bp.business.city}</p>
                        {bp.business.address && <p className="det-biz-addr">{bp.business.address}</p>}
                      </div>
                    </div>
                    <div className="det-biz-right">
                      <div className="det-biz-price-wrap">
                        {hasActiveOffer && (
                          <span className="det-old-price">{bp.price.toLocaleString()} L</span>
                        )}
                        <span className={`det-biz-price ${hasActiveOffer ? "offer" : ""}`}>
                          {displayPrice?.toLocaleString()} L
                        </span>
                        {bp.offerEnd && hasActiveOffer && (
                          <span className="det-offer-end">Deri {new Date(bp.offerEnd).toLocaleDateString("sq-AL", { day: "numeric", month: "short" })}</span>
                        )}
                      </div>
                      <span className={`det-stock ${bp.inStock ? "in" : "out"}`}>
                        {bp.inStock ? "✓ Në stok" : "✗ Pa stok"}
                      </span>
                      {bp.inStock && (
                        <a href={`tel:${bp.business.phone}`} className="det-call-btn"
                          onClick={() => handleContactClick(bp.businessId)}>
                          📞 Kontakto
                        </a>
                      )}
                      <Link href={`/business/${bp.businessId}`} className="det-view-btn">
                        Shiko dyqanin →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .det-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .det-bg{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(245,200,66,0.06) 0%,transparent 60%);pointer-events:none;z-index:0}
        .det-wrap{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:1.5rem}
        .det-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:10px}
        .det-brand{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.02em}
        .det-brand span{color:#f5c842}
        .det-breadcrumb{display:flex;align-items:center;gap:6px;font-size:0.78rem;color:#52525b;flex-wrap:wrap}
        .det-breadcrumb a{color:#71717a;text-decoration:none;transition:color .2s}
        .det-breadcrumb a:hover{color:#f5c842}
        .det-breadcrumb span:last-child{color:#a1a1aa}
        .det-main{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2.5rem}
        .det-photos{display:flex;flex-direction:column;gap:10px}
        .det-img-main{aspect-ratio:1;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .det-img-main img{width:100%;height:100%;object-fit:cover}
        .det-no-img{font-size:4rem}
        .det-thumbs{display:flex;gap:8px;flex-wrap:wrap}
        .det-thumb{width:60px;height:60px;border-radius:8px;overflow:hidden;border:2px solid rgba(255,255,255,0.08);cursor:pointer;padding:0;background:none;transition:border-color .2s}
        .det-thumb.active{border-color:#f5c842}
        .det-thumb img{width:100%;height:100%;object-fit:cover}
        .det-info{display:flex;flex-direction:column;gap:1rem;padding-top:0.5rem}
        .det-badges{display:flex;gap:6px;flex-wrap:wrap}
        .det-cat-badge{font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:6px;background:rgba(245,200,66,0.1);color:#f5c842;border:1px solid rgba(245,200,66,0.2)}
        .det-subcat-badge{font-size:0.72rem;font-weight:500;padding:3px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:#71717a;border:1px solid rgba(255,255,255,0.08)}
        .det-title{font-size:1.6rem;font-weight:800;color:#fff;letter-spacing:-0.025em;line-height:1.2}
        .det-brand{font-size:0.82rem;color:#71717a}
        .det-brand strong{color:#a1a1aa}
        .det-price-row{display:flex;align-items:baseline;gap:8px;padding:1rem;background:rgba(245,200,66,0.05);border:1px solid rgba(245,200,66,0.15);border-radius:12px}
        .det-price-label{font-size:0.78rem;color:#71717a}
        .det-price{font-size:1.75rem;font-weight:800;color:#f5c842;letter-spacing:-0.03em}
        .det-price-sub{font-size:0.75rem;color:#52525b}
        .det-desc h3{font-size:0.78rem;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px}
        .det-desc p{font-size:0.875rem;color:#a1a1aa;line-height:1.7}
        .det-tags{display:flex;flex-wrap:wrap;gap:6px}
        .det-tag{font-size:0.72rem;padding:3px 9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:999px;color:#71717a}
        .det-barcode{font-size:0.75rem;color:#52525b}
        .det-barcode code{font-family:monospace;color:#71717a}
        .det-biz-section{margin-top:1rem}
        .det-section-title{font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:1.25rem;display:flex;align-items:center;gap:10px}
        .det-biz-count{font-size:0.75rem;font-weight:500;color:#71717a;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:999px}
        .det-no-biz{padding:2rem;text-align:center;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.07);border-radius:12px;color:#71717a}
        .det-search-link{display:inline-block;margin-top:0.75rem;color:#f5c842;text-decoration:none;font-size:0.85rem}
        .det-biz-grid{display:flex;flex-direction:column;gap:10px}
        .det-biz-card{position:relative;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;transition:border-color .2s;flex-wrap:wrap}
        .det-biz-card:hover{border-color:rgba(245,200,66,0.2)}
        .det-biz-card.out-of-stock{opacity:0.6}
        .det-biz-card.featured{border-color:rgba(245,200,66,0.3);background:rgba(245,200,66,0.03)}
        .det-featured-tag{position:absolute;top:-8px;left:12px;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(245,200,66,0.15);color:#f5c842;border:1px solid rgba(245,200,66,0.3)}
        .det-offer-tag{position:absolute;top:-8px;right:12px;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3)}
        .det-biz-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
        .det-biz-logo{width:42px;height:42px;border-radius:10px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;overflow:hidden}
        .det-biz-logo img{width:100%;height:100%;object-fit:cover}
        .det-biz-name{font-size:0.9rem;font-weight:700;color:#e4e4e7}
        .det-biz-city{font-size:0.75rem;color:#71717a;margin-top:2px}
        .det-biz-addr{font-size:0.72rem;color:#52525b}
        .det-biz-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .det-biz-price-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
        .det-old-price{font-size:0.75rem;color:#52525b;text-decoration:line-through}
        .det-biz-price{font-size:1.15rem;font-weight:800;color:#f5c842}
        .det-biz-price.offer{color:#22c55e}
        .det-offer-end{font-size:0.65rem;color:#52525b}
        .det-stock{font-size:0.72rem;font-weight:600;padding:2px 8px;border-radius:4px}
        .det-stock.in{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.2)}
        .det-stock.out{background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
        .det-call-btn{display:flex;align-items:center;gap:6px;padding:0.5rem 1rem;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:8px;color:#4ade80;font-size:0.8rem;font-weight:600;text-decoration:none;white-space:nowrap;transition:background .2s}
        .det-call-btn:hover{background:rgba(34,197,94,0.18)}
        .det-view-btn{font-size:0.78rem;color:#71717a;text-decoration:none;transition:color .2s}
        .det-view-btn:hover{color:#f5c842}
        @media(max-width:700px){.det-main{grid-template-columns:1fr}.det-biz-card{flex-direction:column;align-items:flex-start}.det-biz-right{align-items:flex-start;flex-direction:row;flex-wrap:wrap}}
      `}</style>
    </main>
  );
}
