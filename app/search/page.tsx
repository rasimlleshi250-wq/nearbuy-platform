"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, limit, getCountFromServer } from "firebase/firestore";
import { trackContact } from "@/lib/firebase/analytics";
import { searchWords, pickMainTerm, matchesAllWords } from "@/lib/searchKeywords";
import { getEffectivePlan } from "@/lib/plans";
import { openStatus, whatsappLink, DayHours } from "@/lib/businessInfo";

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
  categories?: string[];
  whatsapp?: string;
  hours?: DayHours[];
  blocked?: boolean;
  rank?: number;
  offers?: boolean;
  productCount?: number;
}

const CITIES = ["Të gjitha", "Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec", "Peshkopi"];
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
      setLoading(true);
      try {
        const searchTerm = searchParams.get("q") || "";

        // Bizneset e verifikuara + paketa që vlen sot (Featured, renditja, ofertat)
        const bizSnap = await getDocs(query(collection(db, "businesses"), where("verified", "==", true)));
        const allBizs = bizSnap.docs
          .map(d => {
            const raw = d.data();
            const plan = getEffectivePlan(raw);
            return { id: d.id, ...raw, featured: plan.featured, rank: plan.rank, offers: plan.offers } as Business;
          })
          .filter(b => !b.blocked);

        // Numri i produkteve për çdo biznes — me numërim, pa i lexuar
        await Promise.all(allBizs.map(async b => {
          try {
            b.productCount = (await getCountFromServer(query(collection(db, "business_products"), where("businessId", "==", b.id)))).data().count;
          } catch { b.productCount = 0; }
        }));

        const words = searchWords(searchTerm);
        const main = pickMainTerm(words);
        if (!main) { setBusinesses(allBizs); return; }

        // Produktet që përputhen — me fjalët kyçe (max 100 lexime), jo gjithë katalogu
        const prodSnap = await getDocs(query(collection(db, "products"), where("searchKeywords", "array-contains", main), limit(100)));
        const matchingProducts = prodSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as { id: string; name: string; images?: string[]; status?: string; brand?: string }))
          .filter(p => (p.status || "active") === "active" && matchesAllWords(`${p.name} ${p.brand || ""}`, words));

        // Çmimet e bizneseve vetëm për këto produkte (në grupe nga 30)
        const ids = matchingProducts.map(p => p.id);
        const bizProductMatches: { businessId: string; productId: string; price: number; offerPrice?: number; inStock?: boolean }[] = [];
        for (let i = 0; i < ids.length; i += 30) {
          const snap = await getDocs(query(collection(db, "business_products"), where("productId", "in", ids.slice(i, i + 30))));
          snap.docs.forEach(d => bizProductMatches.push(d.data() as typeof bizProductMatches[number]));
        }

        const byBiz = new Map<string, typeof bizProductMatches>();
        bizProductMatches.filter(bp => bp.inStock !== false).forEach(bp => byBiz.set(bp.businessId, [...(byBiz.get(bp.businessId) || []), bp]));

        const withProduct: BusinessWithProduct[] = [];
        for (const biz of allBizs) {
          const list = byBiz.get(biz.id);
          if (!list) continue;
          // Produkti më i lirë që përputhet
          const effective = (bp: typeof list[number]) => (biz.offers && bp.offerPrice && bp.offerPrice < bp.price ? bp.offerPrice : bp.price);
          const bp = [...list].sort((a, b) => effective(a) - effective(b))[0];
          const prod = matchingProducts.find(p => p.id === bp.productId);
          withProduct.push({
            ...biz,
            matchedProduct: prod ? {
              name: prod.name, price: bp.price || 0, image: prod.images?.[0],
              offerPrice: biz.offers && bp.offerPrice && bp.offerPrice < bp.price ? bp.offerPrice : undefined,
            } : undefined,
          });
        }

        const q = searchTerm.toLowerCase();
        const byName = allBizs.filter(b => !byBiz.has(b.id) && (
          b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) ||
          (b.categories || [b.category]).some(c => c?.toLowerCase().includes(q))
        ));
        setBusinesses([...withProduct, ...byName]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [searchParams]);

  const filtered = businesses.filter(b => {
    const matchCity = cityFilter === "Të gjitha" || b.city === cityFilter;
    const matchCat = catFilter === "Të gjitha" || (b.categories && b.categories.length ? b.categories : [b.category]).includes(catFilter);
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
            {/* Premium të parët, pastaj Plus; brenda paketës, ata me produkt më të lirë / më shumë produkte */}
            {[...filtered].sort((a, b) => (b.rank || 0) - (a.rank || 0)
              || ((a as BusinessWithProduct).matchedProduct && (b as BusinessWithProduct).matchedProduct
                ? ((a as BusinessWithProduct).matchedProduct!.offerPrice || (a as BusinessWithProduct).matchedProduct!.price) - ((b as BusinessWithProduct).matchedProduct!.offerPrice || (b as BusinessWithProduct).matchedProduct!.price)
                : (b.productCount || 0) - (a.productCount || 0))).map(b => {
              const status = openStatus(b.hours);
              const wa = whatsappLink(b.whatsapp || b.phone, (b as BusinessWithProduct).matchedProduct
                ? `Përshëndetje, e keni "${(b as BusinessWithProduct).matchedProduct!.name}"? E pashë në NearBuy.al.`
                : `Përshëndetje ${b.name}, ju gjeta në NearBuy.al dhe kam një pyetje.`);
              return (
              <div key={b.id} className={`sr-card ${b.featured ? "sr-card-featured" : ""}`}>
                {b.featured && <div className="sr-feat">⭐ I rekomanduar</div>}
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
                      <p className="sr-cat">{(b.categories && b.categories.length ? b.categories : [b.category]).join(" · ")}</p>
                      <p className="sr-city">📍 {b.city}{b.productCount ? ` · ${b.productCount} produkte` : ""}</p>
                      {status && <p className={`sr-open ${status.open ? "on" : ""}`}>● {status.label}</p>}
                    </div>
                  </div>
                  {b.description && <p className="sr-desc">{b.description.slice(0, 90)}{b.description.length > 90 ? "..." : ""}</p>}
                  {b.address && <p className="sr-addr">🗺 {b.address}</p>}
                </Link>
                <div className="sr-card-footer">
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="sr-wa" onClick={() => trackContact("businesses", b.id)}>💬 WhatsApp</a>}
                  {b.phone && (
                    <a href={`tel:${b.phone}`} className="sr-call" onClick={() => trackContact("businesses", b.id)}>📞 Telefono</a>
                  )}
                  <Link href={`/business/${b.id}`} className="sr-view-btn">Dyqani →</Link>
                </div>
              </div>
              );
            })}
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
        .sr-card-footer{display:flex;gap:8px;margin-top:auto;flex-wrap:wrap}
        .sr-wa{display:inline-flex;align-items:center;gap:4px;padding:0.5rem 0.9rem;background:#16a34a;color:#fff;border-radius:8px;font-size:0.8rem;font-weight:700;text-decoration:none;white-space:nowrap}
        .sr-open{font-size:0.72rem;font-weight:600;color:#f87171;margin-top:2px}
        .sr-open.on{color:#22c55e}
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
