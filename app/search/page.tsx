"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { trackView, trackContact } from "@/lib/firebase/analytics";

interface BusinessWithProduct extends Business {
  matchedProduct?: {
    name: string;
    price: number;
    image?: string;
    offerPrice?: number;
  };
}

interface Business {
  id: string;
  name: string;
  city: string;
  category: string;
  logo?: string;
  verified: boolean;
  featured: boolean;
  phone?: string;
  address?: string;
  description?: string;
  subscription: string;
}

const CITIES = ["Të gjitha", "Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Gjirokastër", "Sarandë"];
const CATEGORIES = ["Të gjitha", "Hidraulikë", "Elektrik", "Ndërtim", "Bojëra & Kimikate", "Kopshtari"];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [cityFilter, setCityFilter] = useState("Të gjitha");
  const [catFilter, setCatFilter] = useState("Të gjitha");

  useEffect(() => {
    const load = async () => {
      try {
        const searchTerm = searchParams.get("q") || "";
        
        // Ngarko bizneset e verifikuara
        const bizQ = query(collection(db, "businesses"), where("verified", "==", true));
        const bizSnap = await getDocs(bizQ);
        const allBizs = bizSnap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
        
        if (searchTerm.trim()) {
          // Kërko te produktet me filter status
          const prodQ = query(
            collection(db, "products"),
            where("status", "==", "active")
          );
          const prodSnap = await getDocs(prodQ);
          const searchLower = searchTerm.toLowerCase();
          const matchingProducts = prodSnap.docs
            .filter(d => {
              const data = d.data();
              return data.name?.toLowerCase().includes(searchLower) ||
                     data.category?.toLowerCase().includes(searchLower) ||
                     data.subcategory?.toLowerCase().includes(searchLower) ||
                     data.brand?.toLowerCase().includes(searchLower) ||
                     data.tags?.some((t: string) => t.toLowerCase().includes(searchLower));
            })
            .map(d => ({ id: d.id, ...d.data() }))
            .slice(0, 100); // Limit 100

          if (matchingProducts.length > 0) {
            // Gjej bizneset që kanë këto produkte
            const productIds = matchingProducts.map((p: any) => p.id);
            const bizProductsSnap = await getDocs(collection(db, "business_products"));
            const bizProductMatches = bizProductsSnap.docs
              .filter(d => productIds.includes(d.data().productId))
              .map(d => d.data());

            const bizIdsWithProduct = new Set(bizProductMatches.map((bp: any) => bp.businessId));
            
            // Bashko me bizneset
            const bizsWithProducts: BusinessWithProduct[] = [];
            for (const biz of allBizs) {
              if (bizIdsWithProduct.has(biz.id)) {
                const bp = bizProductMatches.find((b: any) => b.businessId === biz.id);
                const prod = matchingProducts.find((p: any) => p.id === bp?.productId) as any;
                bizsWithProducts.push({
                  ...biz,
                  matchedProduct: prod ? {
                    name: prod.name,
                    price: bp?.price || 0,
                    image: prod.images?.[0],
                    offerPrice: bp?.offerPrice || undefined,
                  } : undefined
                });
              }
            }
            
            // Shto edhe bizneset që përputhen me emrin/kategorinë
            const bizByName = allBizs.filter(b =>
              !bizIdsWithProduct.has(b.id) && (
                b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
            );
            
            const combined = [...bizsWithProducts, ...bizByName];
            setBusinesses(combined);
            combined.forEach(b => trackView("businesses", b.id));
          } else {
            // Kërkim i thjeshtë te bizneset
            const filtered = allBizs.filter(b =>
              b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              b.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              b.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              b.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setBusinesses(filtered);
            filtered.forEach(b => trackView("businesses", b.id));
          }
        } else {
          setBusinesses(allBizs);
          allBizs.forEach(b => trackView("businesses", b.id));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [searchParams]);

  const filtered = businesses.filter(b => {
    const matchCity = cityFilter === "Të gjitha" || b.city === cityFilter;
    const matchCat = catFilter === "Të gjitha" || b.category?.toLowerCase().includes(catFilter.toLowerCase());
    return matchCity && matchCat;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="sr-root">
      <nav className="sr-nav">
        <Link href="/" className="sr-logo">Near<span>Buy</span>.al</Link>
        <div className="sr-nav-right">
          <Link href="/professionals" className="sr-nav-link">Profesionistë</Link>
          <Link href="/auth/login" className="sr-nav-login">Hyr</Link>
          <Link href="/auth/register" className="sr-nav-reg">Regjistrohu</Link>
        </div>
      </nav>

      <div className="sr-container">
        <form onSubmit={handleSearch} className="sr-search-bar">
          <div className="sr-search-wrap">
            <svg className="sr-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kërko produkte, shërbime, biznese..."
              className="sr-search-input"
              autoFocus
            />
            {search && <button type="button" onClick={() => setSearch("")} className="sr-clear">✕</button>}
          </div>
          <button type="submit" className="sr-search-btn">Kërko</button>
        </form>

        <div className="sr-filters">
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="sr-select">
            {CITIES.map(c => <option key={c} value={c}>{c === "Të gjitha" ? "🏙 Të gjitha qytetet" : c}</option>)}
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="sr-select">
            {CATEGORIES.map(c => <option key={c} value={c}>{c === "Të gjitha" ? "📂 Të gjitha kategoritë" : c}</option>)}
          </select>
        </div>

        <div className="sr-results-header">
          <p className="sr-count">
            {loading ? "Duke kërkuar..." : `${filtered.length} rezultate${search ? ` për "${search}"` : ""}`}
          </p>
        </div>

        {loading ? (
          <div className="sr-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="sr-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="sr-empty">
            <span>🔍</span>
            <p>Nuk u gjetën rezultate për këtë kërkim.</p>
            <button onClick={() => { setSearch(""); setCityFilter("Të gjitha"); setCatFilter("Të gjitha"); }} className="sr-reset">
              Pastro filtrat
            </button>
          </div>
        ) : (
          <div className="sr-grid">
            {filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).map(b => (
              <div key={b.id} className={`sr-card ${b.featured ? "sr-card-featured" : ""}`}>
                {b.featured && <div className="sr-feat">⭐ Featured</div>}
                <Link href={`/business/${b.id}`} className="sr-card-link">
                  {(b as any).matchedProduct && (
                    <div className="sr-product-match">
                      <div className="sr-product-img">
                        {(b as any).matchedProduct.image
                          ? <img src={(b as any).matchedProduct.image} alt={(b as any).matchedProduct.name} />
                          : <span>📦</span>}
                      </div>
                      <div className="sr-product-info">
                        <p className="sr-product-name">{(b as any).matchedProduct.name}</p>
                        <div className="sr-product-prices">
                          {(b as any).matchedProduct.offerPrice ? (
                            <>
                              <span className="sr-offer-price">{(b as any).matchedProduct.offerPrice.toLocaleString()} L</span>
                              <span className="sr-old-price">{(b as any).matchedProduct.price.toLocaleString()} L</span>
                            </>
                          ) : (
                            <span className="sr-price">{(b as any).matchedProduct.price.toLocaleString()} L</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="sr-card-top">
                    <div className="sr-logo">
                      {b.logo ? <img src={b.logo} alt={b.name} /> : <span>🏪</span>}
                    </div>
                    <div className="sr-card-info">
                      <p className="sr-name">{b.name}</p>
                      <p className="sr-cat">{b.category}</p>
                      <p className="sr-city">📍 {b.city}</p>
                    </div>
                  </div>
                  {b.description && <p className="sr-desc">{b.description.slice(0, 90)}{b.description.length > 90 ? "..." : ""}</p>}
                  {b.address && <p className="sr-addr">🗺 {b.address}</p>}
                </Link>
                <div className="sr-card-footer">
                  {b.phone && (
                    <a href={`tel:${b.phone}`} className="sr-call" onClick={() => trackContact("businesses", b.id)}>📞 {b.phone}</a>
                  )}
                  <Link href={`/business/${b.id}`} className="sr-view-btn">Shiko dyqanin →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .sr-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .sr-nav{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:60px;background:rgba(10,10,10,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .sr-logo{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.02em}
        .sr-logo span{color:#f5c842}
        .sr-nav-right{display:flex;align-items:center;gap:10px}
        .sr-nav-link{font-size:0.85rem;color:#a1a1aa;text-decoration:none;padding:0.4rem 0.8rem;transition:color .2s}
        .sr-nav-link:hover{color:#fff}
        .sr-nav-login{font-size:0.85rem;color:#a1a1aa;text-decoration:none;padding:0.4rem 0.8rem}
        .sr-nav-reg{font-size:0.85rem;font-weight:700;color:#0a0a0a;background:#f5c842;padding:0.4rem 1rem;border-radius:8px;text-decoration:none}
        .sr-container{max-width:1100px;margin:0 auto;padding:2rem 1.5rem}
        .sr-search-bar{display:flex;gap:10px;margin-bottom:1rem}
        .sr-search-wrap{position:relative;flex:1}
        .sr-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none}
        .sr-search-input{width:100%;padding:0.85rem 2.5rem 0.85rem 2.75rem;background:#1c1c1c;border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#f4f4f5;font-size:0.95rem;outline:none;font-family:inherit;transition:border-color .2s,box-shadow .2s}
        .sr-search-input:focus{border-color:rgba(245,200,66,0.4);box-shadow:0 0 0 3px rgba(245,200,66,0.08)}
        .sr-search-input::placeholder{color:#3f3f46}
        .sr-clear{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#52525b;cursor:pointer;font-size:0.85rem;padding:4px}
        .sr-search-btn{padding:0 1.5rem;background:#f5c842;color:#0a0a0a;font-size:0.875rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background .2s}
        .sr-search-btn:hover{background:#e6b93a}
        .sr-filters{display:flex;gap:10px;margin-bottom:1.5rem;flex-wrap:wrap}
        .sr-select{padding:0.6rem 0.9rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.85rem;outline:none;font-family:inherit;cursor:pointer}
        .sr-select option{background:#1c1c1c}
        .sr-results-header{margin-bottom:1rem}
        .sr-count{font-size:0.8rem;color:#52525b}
        .sr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
        .sr-skeleton{height:180px;background:rgba(255,255,255,0.04);border-radius:14px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .sr-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:4rem;color:#52525b;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.07);border-radius:14px;text-align:center}
        .sr-empty span{font-size:2.5rem}
        .sr-reset{padding:0.5rem 1.25rem;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#a1a1aa;font-size:0.82rem;cursor:pointer;font-family:inherit;transition:all .2s}
        .sr-reset:hover{border-color:rgba(245,200,66,0.3);color:#f5c842}
        .sr-card{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px;transition:border-color .2s,transform .2s}
        .sr-card:hover{border-color:rgba(245,200,66,0.25);transform:translateY(-2px)}
        .sr-card-featured{border-color:rgba(245,200,66,0.2);background:rgba(245,200,66,0.02)}
        .sr-feat{position:absolute;top:10px;right:10px;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(245,200,66,0.15);color:#f5c842;border:1px solid rgba(245,200,66,0.3)}
        .sr-card-top{display:flex;align-items:center;gap:12px}
        .sr-logo{width:48px;height:48px;border-radius:10px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.15);display:flex;align-items:center;justify-content:center;font-size:1.4rem;overflow:hidden;flex-shrink:0}
        .sr-logo img{width:100%;height:100%;object-fit:cover}
        .sr-name{font-size:0.95rem;font-weight:700;color:#f4f4f5}
        .sr-cat{font-size:0.75rem;color:#f5c842;font-weight:500;margin-top:1px}
        .sr-city{font-size:0.75rem;color:#52525b;margin-top:2px}
        .sr-desc{font-size:0.78rem;color:#71717a;line-height:1.5}
        .sr-addr{font-size:0.75rem;color:#52525b}
        .sr-card-link{display:flex;flex-direction:column;gap:10px;text-decoration:none;color:inherit}
        .sr-card-footer{display:flex;gap:8px;margin-top:auto}
        .sr-call{flex:1;text-align:center;padding:0.6rem;background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.2);border-radius:10px;color:#f5c842;font-size:0.82rem;font-weight:600;text-decoration:none;transition:background .2s}
        .sr-call:hover{background:rgba(245,200,66,0.15)}
        .sr-view-btn{flex:1;text-align:center;padding:0.6rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#a1a1aa;font-size:0.82rem;font-weight:500;text-decoration:none;transition:all .2s}
        .sr-view-btn:hover{border-color:rgba(249,115,22,0.3);color:#f97316}
        .sr-product-match{display:flex;align-items:center;gap:10px;background:rgba(245,200,66,0.06);border:1px solid rgba(245,200,66,0.15);border-radius:10px;padding:8px 10px}
        .sr-product-img{width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:1.2rem;overflow:hidden;flex-shrink:0}
        .sr-product-img img{width:100%;height:100%;object-fit:cover}
        .sr-product-name{font-size:0.8rem;font-weight:600;color:#e4e4e7;margin-bottom:3px}
        .sr-product-prices{display:flex;align-items:center;gap:6px}
        .sr-price{font-size:0.85rem;font-weight:700;color:#f5c842}
        .sr-offer-price{font-size:0.85rem;font-weight:700;color:#f5c842}
        .sr-old-price{font-size:0.75rem;color:#52525b;text-decoration:line-through}
        @media(max-width:600px){.sr-nav{padding:0 1rem}.sr-nav-link{display:none}.sr-search-bar{flex-direction:column}.sr-search-btn{padding:0.85rem}.sr-filters{flex-direction:column}}
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(245,200,66,0.2)", borderTopColor: "#f5c842", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
