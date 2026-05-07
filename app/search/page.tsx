"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Link from "next/link";
import { Product, Business, BusinessProduct } from "@/types";

interface SearchResult {
  product: Product;
  listings: (BusinessProduct & { business: Business })[];
}

const CATEGORIES = ["Të gjitha", "Ushqimore & Supermarket", "Elektronikë & Teknologji", "Ndërtim & Materiale", "Mobilje & Dekor", "Veshje & Këpucë", "Farmaci & Shëndet", "Auto & Pjesë Këmbimi", "Hidraulikë & Instalime", "Elektrik & Ndriçim"];
const CITIES = ["Të gjitha", "Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë"];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "Të gjitha");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("cat") || "Të gjitha");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "name">("price_asc");

  const doSearch = useCallback(async (q: string, city: string, cat: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      // 1. Gjej produktet që përputhen
      const prodSnap = await getDocs(collection(db, "products"));
      const allProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(p => p.status === "active" && (
          p.name?.toLowerCase().includes(q.toLowerCase()) ||
          p.description?.toLowerCase().includes(q.toLowerCase()) ||
          p.brand?.toLowerCase().includes(q.toLowerCase()) ||
          p.tags?.some(t => t.toLowerCase().includes(q.toLowerCase()))
        ))
        .filter(p => cat === "Të gjitha" || p.category === cat);

      if (allProducts.length === 0) { setResults([]); setLoading(false); return; }

      // 2. Gjej bizneset e verifikuara
      const bizConstraints = [where("verified", "==", true)];
      if (city !== "Të gjitha") bizConstraints.push(where("city", "==", city));
      const bizSnap = await getDocs(query(collection(db, "businesses"), ...bizConstraints));
      const businesses = Object.fromEntries(bizSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as Business]));

      // 3. Gjej çmimet për çdo produkt
      const resultsArr: SearchResult[] = [];
      for (const product of allProducts) {
        const bpSnap = await getDocs(query(
          collection(db, "business_products"),
          where("productId", "==", product.id),
          where("inStock", "==", true)
        ));
        const listings = bpSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as BusinessProduct))
          .filter(bp => businesses[bp.businessId])
          .map(bp => ({ ...bp, business: businesses[bp.businessId] }))
          .sort((a, b) => a.price - b.price);

        if (listings.length > 0) {
          resultsArr.push({ product, listings });
        }
      }

      setResults(resultsArr);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    const city = searchParams.get("city") || "Të gjitha";
    const cat = searchParams.get("cat") || "Të gjitha";
    if (q) {
      setSearchQuery(q);
      setSelectedCity(city);
      setSelectedCategory(cat);
      doSearch(q, city, cat);
    }
  }, [searchParams, doSearch]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    const params = new URLSearchParams();
    params.set("q", searchQuery.trim());
    if (selectedCity !== "Të gjitha") params.set("city", selectedCity);
    if (selectedCategory !== "Të gjitha") params.set("cat", selectedCategory);
    router.push(`/search?${params.toString()}`);
    doSearch(searchQuery, selectedCity, selectedCategory);
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "price_asc") return (a.listings[0]?.price || 0) - (b.listings[0]?.price || 0);
    if (sortBy === "price_desc") return (b.listings[0]?.price || 0) - (a.listings[0]?.price || 0);
    return a.product.name.localeCompare(b.product.name);
  });

  return (
    <div className="sr-root">
      {/* Header */}
      <header className="sr-header">
        <div className="sr-header-inner">
          <Link href="/" className="sr-brand">
            Near<span>Buy</span>.al
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="sr-search-form">
            <div className="sr-search-bar">
              <svg className="sr-search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Çfarë po kërkon? (p.sh. rubinet, llambadar...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="sr-search-input"
                autoFocus
              />
              <button type="submit" className="sr-search-btn">Kërko</button>
            </div>
          </form>

          <Link href="/auth/login" className="sr-login-btn">Hyr</Link>
        </div>

        {/* Filters */}
        <div className="sr-filters">
          <div className="sr-filter-group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="sr-filter-select">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sr-filter-group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="sr-filter-select">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="sr-main">
        {!searched && (
          <div className="sr-welcome">
            <div className="sr-welcome-icon">🔍</div>
            <h2>Kërko produktin që dëshiron</h2>
            <p>Shiko ku e gjen afër teje me çmimin më të mirë</p>
            <div className="sr-suggestions">
              {["Rubinet", "Llambadar", "Çimento", "Kabllo elektrik", "Tulla", "Gyp PPR"].map(s => (
                <button key={s} onClick={() => { setSearchQuery(s); doSearch(s, selectedCity, selectedCategory); }}
                  className="sr-suggestion">{s}</button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="sr-loading">
            <div className="sr-spinner" />
            <p>Duke kërkuar...</p>
          </div>
        )}

        {searched && !loading && (
          <>
            {/* Results header */}
            <div className="sr-results-header">
              <p className="sr-results-count">
                {results.length === 0
                  ? `Nuk u gjet asnjë rezultat për "${searchParams.get("q")}"`
                  : `${results.length} produkt${results.length !== 1 ? "e" : ""} u gjet${results.length !== 1 ? "ën" : ""} për "${searchParams.get("q")}"`
                }
              </p>
              {results.length > 0 && (
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="sr-sort">
                  <option value="price_asc">Çmimi ↑</option>
                  <option value="price_desc">Çmimi ↓</option>
                  <option value="name">Emri A-Z</option>
                </select>
              )}
            </div>

            {results.length === 0 ? (
              <div className="sr-no-results">
                <p>😕 Nuk u gjet asnjë dyqan me këtë produkt.</p>
                <p>Provo me fjalë të tjera ose zgjero kërkimin në qytete të tjera.</p>
              </div>
            ) : (
              <div className="sr-results">
                {sortedResults.map(({ product, listings }) => (
                  <div key={product.id} className="sr-product-card">
                    {/* Product Info */}
                    <div className="sr-product-top">
                      <div className="sr-product-img">
                        {product.images?.[0]
                          ? <img src={product.images[0]} alt={product.name} />
                          : <span>🛍</span>
                        }
                      </div>
                      <div className="sr-product-info">
                        <h3 className="sr-product-name">{product.name}</h3>
                        {product.brand && <p className="sr-product-brand">{product.brand}</p>}
                        {product.description && <p className="sr-product-desc">{product.description.slice(0, 100)}{product.description.length > 100 ? "..." : ""}</p>}
                        <div className="sr-product-meta">
                          <span className="sr-cat-badge">{product.category}</span>
                          <span className="sr-shops-count">
                            {listings.length} dyqan{listings.length !== 1 ? "e" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="sr-best-price">
                        <span className="sr-price-label">Çmimi më i lirë</span>
                        <span className="sr-price-value">{listings[0].price.toLocaleString()} L</span>
                        <span className="sr-price-shop">{listings[0].business.name}</span>
                      </div>
                    </div>

                    {/* Listings */}
                    <div className="sr-listings">
                      {listings.map((listing, i) => (
                        <div key={listing.id} className={`sr-listing ${i === 0 ? "best" : ""}`}>
                          <div className="sr-listing-left">
                            {i === 0 && <span className="sr-best-badge">🏆 Çmimi më i mirë</span>}
                            <div className="sr-listing-shop">
                              {listing.business.logo
                                ? <img src={listing.business.logo} alt={listing.business.name} className="sr-shop-logo" />
                                : <div className="sr-shop-logo-placeholder">🏪</div>
                              }
                              <div>
                                <p className="sr-shop-name">
                                  {listing.business.name}
                                  {listing.business.featured && <span className="sr-featured-badge">⭐ Pro</span>}
                                </p>
                                <p className="sr-shop-address">📍 {listing.business.address}, {listing.business.city}</p>
                                {listing.business.schedule && (
                                  <p className="sr-shop-schedule">🕐 {listing.business.schedule.split(",")[0]}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="sr-listing-right">
                            <span className="sr-listing-price">{listing.price.toLocaleString()} L</span>
                            <div className="sr-listing-actions">
                              {listing.business.location && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${(listing.business.location as any).latitude},${(listing.business.location as any).longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="sr-action-btn sr-maps-btn"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                  </svg>
                                  Drejto
                                </a>
                              )}
                              {listing.business.phone && (
                                <a href={`tel:${listing.business.phone}`} className="sr-action-btn sr-call-btn">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17.5z"/>
                                  </svg>
                                  Thirr
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .sr-root { min-height: 100vh; background: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #f5f5f4; }

        /* Header */
        .sr-header { background: #111; border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; z-index: 50; }
        .sr-header-inner { display: flex; align-items: center; gap: 16px; padding: 0.875rem 1.5rem; }
        .sr-brand { font-size: 1.1rem; font-weight: 800; color: #fff; text-decoration: none; white-space: nowrap; letter-spacing: -0.02em; flex-shrink: 0; }
        .sr-brand span { color: #f5c842; }
        .sr-search-form { flex: 1; max-width: 600px; }
        .sr-search-bar { display: flex; align-items: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; transition: border-color .2s, box-shadow .2s; }
        .sr-search-bar:focus-within { border-color: rgba(245,200,66,0.4); box-shadow: 0 0 0 3px rgba(245,200,66,0.08); }
        .sr-search-ico { margin: 0 12px; color: #52525b; flex-shrink: 0; }
        .sr-search-input { flex: 1; background: none; border: none; outline: none; color: #f5f5f4; font-size: 0.9rem; padding: 0.7rem 0; font-family: inherit; }
        .sr-search-input::placeholder { color: #3f3f46; }
        .sr-search-btn { padding: 0.65rem 1.25rem; background: #f5c842; color: #0a0a0a; font-size: 0.875rem; font-weight: 700; border: none; cursor: pointer; white-space: nowrap; transition: background .2s; font-family: inherit; }
        .sr-search-btn:hover { background: #e6b93a; }
        .sr-login-btn { padding: 0.5rem 1rem; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #a1a1aa; font-size: 0.8rem; font-weight: 500; text-decoration: none; white-space: nowrap; flex-shrink: 0; transition: all .2s; }
        .sr-login-btn:hover { border-color: rgba(255,255,255,0.2); color: #fff; }

        .sr-filters { display: flex; gap: 10px; padding: 0.6rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); }
        .sr-filter-group { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.4rem 0.75rem; color: #71717a; }
        .sr-filter-select { background: none; border: none; outline: none; color: #a1a1aa; font-size: 0.82rem; cursor: pointer; font-family: inherit; }
        .sr-filter-select option { background: #1c1c1c; }

        /* Main */
        .sr-main { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem; }

        /* Welcome */
        .sr-welcome { text-align: center; padding: 4rem 1rem; }
        .sr-welcome-icon { font-size: 3rem; margin-bottom: 1rem; }
        .sr-welcome h2 { font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .sr-welcome p { color: #71717a; font-size: 0.9rem; margin-bottom: 1.75rem; }
        .sr-suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .sr-suggestion { padding: 0.45rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; color: #a1a1aa; font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: all .15s; }
        .sr-suggestion:hover { background: rgba(245,200,66,0.1); border-color: rgba(245,200,66,0.3); color: #f5c842; }

        /* Loading */
        .sr-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 4rem; color: #71717a; }
        .sr-spinner { width: 28px; height: 28px; border: 2px solid rgba(245,200,66,0.2); border-top-color: #f5c842; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Results */
        .sr-results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
        .sr-results-count { font-size: 0.875rem; color: #71717a; }
        .sr-sort { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #a1a1aa; font-size: 0.82rem; padding: 0.4rem 0.75rem; outline: none; font-family: inherit; cursor: pointer; }
        .sr-no-results { text-align: center; padding: 3rem; color: #71717a; }
        .sr-no-results p { margin-bottom: 8px; font-size: 0.9rem; }
        .sr-results { display: flex; flex-direction: column; gap: 1.25rem; }

        /* Product Card */
        .sr-product-card { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
        .sr-product-top { display: flex; gap: 14px; padding: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .sr-product-img { width: 80px; height: 80px; border-radius: 10px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0; overflow: hidden; }
        .sr-product-img img { width: 100%; height: 100%; object-fit: cover; }
        .sr-product-info { flex: 1; }
        .sr-product-name { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 3px; letter-spacing: -0.01em; }
        .sr-product-brand { font-size: 0.78rem; color: #71717a; margin-bottom: 4px; }
        .sr-product-desc { font-size: 0.8rem; color: #71717a; line-height: 1.4; margin-bottom: 8px; }
        .sr-product-meta { display: flex; align-items: center; gap: 8px; }
        .sr-cat-badge { font-size: 0.72rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; padding: 2px 7px; color: #a1a1aa; }
        .sr-shops-count { font-size: 0.72rem; color: #71717a; }
        .sr-best-price { text-align: right; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; }
        .sr-price-label { font-size: 0.7rem; color: #71717a; text-transform: uppercase; letter-spacing: 0.04em; }
        .sr-price-value { font-size: 1.4rem; font-weight: 800; color: #f5c842; letter-spacing: -0.02em; }
        .sr-price-shop { font-size: 0.72rem; color: #71717a; }

        /* Listings */
        .sr-listings { display: flex; flex-direction: column; }
        .sr-listing { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0.9rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.04); transition: background .15s; }
        .sr-listing:last-child { border-bottom: none; }
        .sr-listing:hover { background: rgba(255,255,255,0.02); }
        .sr-listing.best { background: rgba(245,200,66,0.04); border-left: 3px solid rgba(245,200,66,0.4); }
        .sr-listing-left { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .sr-best-badge { font-size: 0.7rem; font-weight: 700; color: #f5c842; background: rgba(245,200,66,0.1); border: 1px solid rgba(245,200,66,0.2); padding: 2px 8px; border-radius: 4px; display: inline-block; width: fit-content; }
        .sr-listing-shop { display: flex; align-items: flex-start; gap: 10px; }
        .sr-shop-logo { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .sr-shop-logo-placeholder { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
        .sr-shop-name { font-size: 0.875rem; font-weight: 600; color: #e4e4e7; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
        .sr-featured-badge { font-size: 0.65rem; background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.25); padding: 1px 6px; border-radius: 4px; }
        .sr-shop-address { font-size: 0.75rem; color: #71717a; margin-bottom: 1px; }
        .sr-shop-schedule { font-size: 0.72rem; color: #52525b; }
        .sr-listing-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
        .sr-listing-price { font-size: 1.1rem; font-weight: 700; color: #f5c842; }
        .sr-listing-actions { display: flex; gap: 6px; }
        .sr-action-btn { display: flex; align-items: center; gap: 5px; padding: 0.45rem 0.85rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600; text-decoration: none; transition: all .15s; border: 1px solid; cursor: pointer; }
        .sr-maps-btn { background: rgba(59,130,246,0.1); color: #60a5fa; border-color: rgba(59,130,246,0.25); }
        .sr-maps-btn:hover { background: rgba(59,130,246,0.2); }
        .sr-call-btn { background: rgba(34,197,94,0.1); color: #4ade80; border-color: rgba(34,197,94,0.25); }
        .sr-call-btn:hover { background: rgba(34,197,94,0.2); }

        @media (max-width: 640px) {
          .sr-header-inner { padding: 0.75rem 1rem; gap: 10px; }
          .sr-brand { font-size: 0.95rem; }
          .sr-search-btn { padding: 0.65rem 0.75rem; font-size: 0.8rem; }
          .sr-main { padding: 1.25rem 1rem; }
          .sr-product-top { flex-wrap: wrap; }
          .sr-best-price { text-align: left; }
          .sr-listing { flex-direction: column; align-items: flex-start; }
          .sr-listing-right { width: 100%; flex-direction: row; justify-content: space-between; align-items: center; }
        }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: "2px solid rgba(245,200,66,0.2)", borderTopColor: "#f5c842", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
