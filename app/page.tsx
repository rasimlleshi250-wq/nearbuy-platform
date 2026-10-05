"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, limit, documentId } from "firebase/firestore";
import { getEffectivePlan } from "@/lib/plans";
import { getEffectiveProPlan, normalizeProfession } from "@/lib/proPlans";

interface Business {
  id: string;
  name: string;
  city: string;
  category: string;
  logo?: string;
  verified: boolean;
  featured: boolean;
  subscription: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  images?: string[];
  brand?: string;
  status: string;
  minPrice?: number;     // çmimi më i ulët në dyqane
  oldPrice?: number;     // çmimi para ofertës
  shopCount?: number;
}

interface Professional {
  id: string;
  name: string;
  profession: string;
  city: string;
  photo?: string;
  verified: boolean;
  featured: boolean;
  pricePerHour?: number;
}

// Adresat e profileve publike — ndrysho këtu nëse dosjet quhen ndryshe
const BUSINESS_URL = (id: string) => `/business/${id}`;
const PROFESSIONAL_URL = (id: string) => `/professionals/${id}`;

const CATEGORIES = [
  { name: "Hidraulikë", icon: "🔧" },
  { name: "Elektrik", icon: "⚡" },
  { name: "Ndërtim", icon: "🏗️" },
  { name: "Bojëra & Kimikate", icon: "🎨" },
  { name: "Kopshtari", icon: "🌿" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Kërko", desc: "Shkruaj produktin ose shërbimin që dëshiron dhe zgjidh qytetin tënd.", icon: "🔍" },
  { step: "02", title: "Krahaso", desc: "Shiko bizneset dhe profesionistët afër teje me çmimet dhe oraret e tyre.", icon: "⚖️" },
  { step: "03", title: "Kontakto", desc: "Kontakto direkt biznesin ose profesionistin që të përshtatet.", icon: "📞" },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"products" | "pros">("products");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [loadingPro, setLoadingPro] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProd, setLoadingProd] = useState(true);

  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        // Premium dalin të parat dhe me "Featured"; pastaj Plus, pastaj të tjerët
        const q = query(collection(db, "businesses"), where("verified", "==", true), limit(30));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => {
          const raw = d.data();
          const plan = getEffectivePlan(raw);
          return { id: d.id, ...raw, featured: plan.featured, rank: plan.rank } as Business & { rank: number };
        });
        list.sort((a, b) => b.rank - a.rank);
        setBusinesses(list.slice(0, 6));
      } catch (e) { console.error(e); }
      finally { setLoadingBiz(false); }
    };
    const loadProfessionals = async () => {
      try {
        // Premium të parët, pastaj Pro, pastaj ata me foto punimesh
        const q = query(collection(db, "professionals"), where("verified", "==", true), limit(30));
        const snap = await getDocs(q);
        const list = snap.docs
          .map(d => {
            const raw = d.data();
            const plan = getEffectiveProPlan(raw);
            return {
              id: d.id, ...raw, profession: normalizeProfession(raw.profession), featured: plan.featured, rank: plan.rank,
              photosCount: Array.isArray(raw.workPhotos) ? raw.workPhotos.length : 0,
            } as Professional & { rank: number; photosCount: number; blocked?: boolean };
          })
          .filter(p => !p.blocked)
          .sort((a, b) => b.rank - a.rank || b.photosCount - a.photosCount);
        setProfessionals(list.slice(0, 6));
      } catch (e) { console.error(e); }
      finally { setLoadingPro(false); }
    };
    loadBusinesses();
    loadProfessionals();

    // "Ofertat në dyqanet e zonës": vetëm produkte që i shet të paktën një dyqan
    const loadProducts = async () => {
      try {
        const bpSnap = await getDocs(query(collection(db, "business_products"), where("inStock", "==", true), limit(60)));
        const bps = bpSnap.docs.map(d => d.data() as { productId: string; businessId: string; price: number; offerPrice?: number });
        const bizIds = Array.from(new Set(bps.map(b => b.businessId)));
        const prodIds = Array.from(new Set(bps.map(b => b.productId))).slice(0, 60);

        // Bizneset: vetëm të verifikuara, dhe ofertat vlejnë vetëm nëse paketa i përfshin
        const bizInfo = new Map<string, { ok: boolean; offers: boolean }>();
        for (let i = 0; i < bizIds.length; i += 30) {
          const bs = await getDocs(query(collection(db, "businesses"), where(documentId(), "in", bizIds.slice(i, i + 30))));
          bs.docs.forEach(d => { const raw = d.data(); bizInfo.set(d.id, { ok: !!raw.verified && !raw.blocked, offers: getEffectivePlan(raw).offers }); });
        }
        const prodMap = new Map<string, Product>();
        for (let i = 0; i < prodIds.length; i += 30) {
          const ps = await getDocs(query(collection(db, "products"), where(documentId(), "in", prodIds.slice(i, i + 30))));
          ps.docs.forEach(d => { const raw = d.data(); if ((raw.status || "active") === "active") prodMap.set(d.id, { id: d.id, ...raw } as Product); });
        }

        bps.forEach(bp => {
          const p = prodMap.get(bp.productId);
          const biz = bizInfo.get(bp.businessId);
          if (!p || !biz?.ok) return;
          const offer = biz.offers && bp.offerPrice && bp.offerPrice < bp.price ? bp.offerPrice : undefined;
          const price = offer || bp.price;
          p.shopCount = (p.shopCount || 0) + 1;
          if (p.minPrice === undefined || price < p.minPrice) { p.minPrice = price; p.oldPrice = offer ? bp.price : undefined; }
        });

        const list = Array.from(prodMap.values()).filter(p => p.shopCount)
          .sort((a, b) => Number(!!b.oldPrice) - Number(!!a.oldPrice) || (b.shopCount || 0) - (a.shopCount || 0) || (b.images?.length ? 1 : 0) - (a.images?.length ? 1 : 0));
        setProducts(list.slice(0, 8));
      } catch (e) { console.error(e); }
      finally { setLoadingProd(false); }
    };
    loadProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (mode === "pros") { router.push(q ? `/professionals?q=${encodeURIComponent(q)}` : "/professionals?request=1"); return; }
    if (!q) return;
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  return (
    <main className="nb-home">
      {/* Navbar */}
      <nav className="nb-nav">
        <Link href="/" className="nb-logo">Near<span>Buy</span>.al</Link>
        <div className="nb-nav-actions">
          <Link href="/professionals" className="nb-nav-link">Profesionistë</Link>
          <Link href="/auth/login" className="nb-nav-login">Hyr</Link>
          <Link href="/auth/register" className="nb-nav-register">Regjistrohu</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="nb-hero">
        <div className="nb-hero-glow" />
        <div className="nb-hero-grid" />
        <div className="nb-hero-content">
          <div className="nb-hero-badge">🇦🇱 Dyqane dhe mjeshtër të verifikuar në gjithë Shqipërinë</div>
          <h1 className="nb-hero-title">
            Gjej produktin që dëshiron<br />
            <span className="nb-hero-accent">afër teje, çmimi më i mirë.</span>
          </h1>
          <p className="nb-hero-sub">Krahaso çmimet e dyqaneve pranë teje, ose gjej mjeshtrin e duhur për punën tënde.</p>
          <div className="nb-mode">
            <button type="button" onClick={() => setMode("products")} className={mode === "products" ? "on" : ""}>🔍 Produkte</button>
            <button type="button" onClick={() => setMode("pros")} className={mode === "pros" ? "on" : ""}>🛠 Mjeshtër</button>
          </div>

          <form onSubmit={handleSearch} className="nb-search">
            <div className="nb-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input type="text" placeholder={mode === "products" ? "Çfarë po kërkon? p.sh. silikon, bojler, kabllo..." : "Çfarë mjeshtri? p.sh. hidraulik, elektricist..."} className="nb-search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button type="submit" className="nb-search-btn">Kërko</button>
          </form>

          <div className="nb-tags">
            {(mode === "products"
              ? ["silikon", "bojler", "kabllo", "pllaka", "llambe led", "boje"].map(t => ({ label: t, href: `/products?search=${encodeURIComponent(t)}` }))
              : ["Hidraulik", "Elektricist", "Bojaxhi", "Pllakaxhi", "Teknik kondicionerësh"].map(t => ({ label: t, href: `/professionals?profession=${encodeURIComponent(t)}` }))
            ).map(t => (
              <button key={t.label} onClick={() => router.push(t.href)} className="nb-tag">{t.label}</button>
            ))}
            {mode === "pros" && <button onClick={() => router.push("/professionals?request=1")} className="nb-tag nb-tag-strong">🛠 Përshkruaj punën →</button>}
          </div>
        </div>
      </section>

      {/* Kategoritë */}
      <section className="nb-section">
        <div className="nb-container">
          <div className="nb-section-header">
            <h2 className="nb-section-title">Kërko sipas kategorisë</h2>
            <Link href="/search" className="nb-see-all">Shiko të gjitha →</Link>
          </div>
          <div className="nb-cat-grid">
            {CATEGORIES.map(cat => (
              <button key={cat.name} onClick={() => router.push(`/products?category=${encodeURIComponent(cat.name)}`)} className="nb-cat-card">
                <span className="nb-cat-icon">{cat.icon}</span>
                <span className="nb-cat-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Produktet e fundit */}
      <section className="nb-section nb-section-dark">
        <div className="nb-container">
          <div className="nb-section-header">
            <h2 className="nb-section-title">Në dyqanet e zonës</h2>
            <Link href="/products" className="nb-see-all">Shiko të gjitha →</Link>
          </div>
          {loadingProd ? (
            <div className="nb-loading-row">
              {[...Array(4)].map((_, i) => <div key={i} className="nb-skeleton" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="nb-empty-state"><p>📦 Dyqanet po shtojnë produktet e tyre. <Link href="/products">Shfleto katalogun →</Link></p></div>
          ) : (
            <div className="nb-prod-grid">
              {products.map(p => (
                <Link key={p.id} href={`/products/${p.id}`} className="nb-prod-card">
                  {p.oldPrice && <span className="nb-prod-offer">OFERTË</span>}
                  <div className="nb-prod-img">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span>📦</span>}
                  </div>
                  <div className="nb-prod-info">
                    <p className="nb-prod-name">{p.name}</p>
                    <p className="nb-prod-cat">{p.category}</p>
                    {p.minPrice !== undefined && (
                      <p className="nb-prod-price">
                        {p.oldPrice && <span className="nb-prod-old">{p.oldPrice.toLocaleString()} L</span>}
                        Nga {p.minPrice.toLocaleString()} L
                      </p>
                    )}
                    <p className="nb-prod-shops">🏪 {p.shopCount} {p.shopCount === 1 ? "dyqan" : "dyqane"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Profesionistët */}
      <section className="nb-section nb-section-dark">
        <div className="nb-container">
          <div className="nb-section-header">
            <h2 className="nb-section-title">Profesionistë të Verifikuar</h2>
            <Link href="/professionals" className="nb-see-all">Shiko të gjitha →</Link>
          </div>
          <Link href="/professionals?request=1" className="nb-job-cta">
            <div>
              <p className="nb-job-title">🛠 Ke nevojë për një mjeshtër?</p>
              <p className="nb-job-sub">Hidraulik, elektricist, bojaxhi... Përshkruaj punën dhe mjeshtrat e zonës tënde të kontaktojnë. Falas.</p>
            </div>
            <span className="nb-job-btn">Kërko mjeshtër →</span>
          </Link>
          {loadingPro ? (
            <div className="nb-loading-row">
              {[...Array(3)].map((_, i) => <div key={i} className="nb-skeleton nb-skeleton-pro" />)}
            </div>
          ) : professionals.length === 0 ? (
            <div className="nb-empty-state"><p>👷 Profesionistët e parë do të shfaqen së shpejti!</p></div>
          ) : (
            <div className="nb-pro-grid">
              {professionals.map(p => (
                <Link key={p.id} href={PROFESSIONAL_URL(p.id)} className="nb-pro-card">
                  {p.featured && <div className="nb-featured-badge nb-featured-pro">⭐ Featured</div>}
                  <div className="nb-pro-photo">{p.photo ? <img src={p.photo} alt={p.name} /> : <span>👤</span>}</div>
                  <div>
                    <p className="nb-pro-name">{p.name}</p>
                    <p className="nb-pro-prof">{p.profession}</p>
                    <p className="nb-pro-city">📍 {p.city}</p>
                    {p.pricePerHour && <p className="nb-pro-price">{p.pricePerHour.toLocaleString()} L/orë</p>}
                  </div>
                  <div className="nb-pro-footer"><span className="nb-verified nb-verified-pro">✓ Verifikuar</span></div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bizneset */}
      <section className="nb-section nb-section-dark">
        <div className="nb-container">
          <div className="nb-section-header">
            <h2 className="nb-section-title">Biznese të Verifikuara</h2>
            <Link href="/search" className="nb-see-all">Shiko të gjitha →</Link>
          </div>
          {loadingBiz ? (
            <div className="nb-loading-row">
              {[...Array(3)].map((_, i) => <div key={i} className="nb-skeleton" />)}
            </div>
          ) : businesses.length === 0 ? (
            <div className="nb-empty-state"><p>🏪 Bizneset e para do të shfaqen së shpejti!</p></div>
          ) : (
            <div className="nb-biz-grid">
              {businesses.map(b => (
                <Link key={b.id} href={BUSINESS_URL(b.id)} className="nb-biz-card">
                  {b.featured && <div className="nb-featured-badge">⭐ Featured</div>}
                  <div className="nb-biz-logo">{b.logo ? <img src={b.logo} alt={b.name} /> : <span>🏪</span>}</div>
                  <div>
                    <p className="nb-biz-name">{b.name}</p>
                    <p className="nb-biz-meta">{b.category}</p>
                    <p className="nb-biz-city">📍 {b.city}</p>
                  </div>
                  <div className="nb-biz-footer"><span className="nb-verified">✓ Verifikuar</span></div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Si funksionon */}
      <section className="nb-section">
        <div className="nb-container">
          <div className="nb-section-header nb-section-center">
            <h2 className="nb-section-title">Si funksionon NearBuy.al?</h2>
            <p className="nb-section-sub">Tre hapa të thjeshtë për të gjetur çfarë dëshiron</p>
          </div>
          <div className="nb-how-grid">
            {HOW_IT_WORKS.map((h, i) => (
              <div key={h.step} className="nb-how-card">
                <div className="nb-how-num">{h.step}</div>
                <div className="nb-how-icon">{h.icon}</div>
                <h3 className="nb-how-title">{h.title}</h3>
                <p className="nb-how-desc">{h.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && <div className="nb-how-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="nb-cta">
        <div className="nb-container">
          <div className="nb-cta-box">
            <div className="nb-cta-glow" />
            <h2 className="nb-cta-title">Regjistro biznesin tënd sot</h2>
            <p className="nb-cta-sub">Bëhu pjesë e platformës dhe rrit klientelën tënde</p>
            <div className="nb-cta-btns">
              <Link href="/auth/register?role=business" className="nb-cta-btn-primary">Regjistro biznesin →</Link>
              <Link href="/auth/register?role=professional" className="nb-cta-btn-secondary">Regjistrohu si mjeshtër</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="nb-footer">
        <div className="nb-container">
          <div className="nb-footer-row">
            <p className="nb-footer-logo">Near<span>Buy</span>.al</p>
            <p className="nb-footer-copy">© 2026 NearBuy.al — Të gjitha të drejtat e rezervuara</p>
          </div>
        </div>
      </footer>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .nb-home{min-height:100vh;background:#f8f9fa;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#111}
        .nb-container{max-width:1100px;margin:0 auto;padding:0 1.5rem}
        .nb-nav{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:64px;background:rgba(10,10,10,0.97);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .nb-logo{font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:-0.02em;text-decoration:none}
        .nb-logo span{color:#f5c842}
        .nb-nav-actions{display:flex;align-items:center;gap:12px}
        .nb-nav-link{padding:0.45rem 1rem;color:#a8a29e;font-size:0.875rem;font-weight:500;text-decoration:none;transition:color .2s}
        .nb-nav-link:hover{color:#fff}
        .nb-nav-login{padding:0.45rem 1.1rem;color:#a8a29e;font-size:0.875rem;font-weight:500;border-radius:8px;text-decoration:none;transition:color .2s}
        .nb-nav-login:hover{color:#fff}
        .nb-nav-register{padding:0.45rem 1.2rem;background:#f5c842;color:#0a0a0a;font-size:0.875rem;font-weight:700;border-radius:8px;text-decoration:none;transition:background .2s,transform .15s}
        .nb-nav-register:hover{background:#e6b93a;transform:translateY(-1px)}
        .nb-hero{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:6rem 2rem 4rem;background:#0a0a0a;color:#f5f5f4}
        .nb-hero-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(245,200,66,0.07) 0%,transparent 70%)}
        .nb-hero-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:40px 40px}
        .nb-hero-content{position:relative;z-index:1;text-align:center;max-width:760px;width:100%}
        .nb-hero-badge{display:inline-block;padding:5px 14px;background:rgba(245,200,66,0.1);border:1px solid rgba(245,200,66,0.2);border-radius:999px;font-size:0.78rem;color:#f5c842;font-weight:600;margin-bottom:1.5rem}
        .nb-hero-title{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.15;letter-spacing:-0.03em;color:#fff;margin-bottom:1.25rem}
        .nb-hero-accent{color:#f5c842;display:block}
        .nb-hero-sub{font-size:1rem;color:#78716c;margin-bottom:2.5rem;line-height:1.6}
        .nb-search{display:flex;align-items:center;background:#1c1c1c;border:1px solid rgba(255,255,255,0.1);border-radius:14px;overflow:hidden;max-width:580px;margin:0 auto 1.5rem;transition:border-color .2s,box-shadow .2s}
        .nb-search:focus-within{border-color:rgba(245,200,66,0.4);box-shadow:0 0 0 3px rgba(245,200,66,0.08)}
        .nb-search-icon{padding:0 14px;color:#52524e;flex-shrink:0;display:flex;align-items:center}
        .nb-search-input{flex:1;padding:1rem 0.5rem;background:transparent;border:none;outline:none;color:#f5f5f4;font-size:0.95rem;font-family:inherit}
        .nb-search-input::placeholder{color:#44403c}
        .nb-search-btn{margin:6px;padding:0.65rem 1.4rem;background:#f5c842;color:#0a0a0a;font-size:0.875rem;font-weight:700;border:none;border-radius:10px;cursor:pointer;transition:background .2s,transform .15s;white-space:nowrap;font-family:inherit}
        .nb-search-btn:hover{background:#e6b93a;transform:translateY(-1px)}
        .nb-tags{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
        .nb-tag{padding:0.4rem 1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:999px;font-size:0.8rem;color:#a8a29e;cursor:pointer;font-family:inherit;transition:all .2s}
        .nb-tag:hover{background:rgba(245,200,66,0.1);border-color:rgba(245,200,66,0.3);color:#f5c842}
        .nb-section{padding:5rem 0;background:#f8f9fa}
        .nb-section-dark{background:#fff;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
        .nb-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem}
        .nb-section-center{flex-direction:column;align-items:center;text-align:center;gap:8px}
        .nb-section-title{font-size:1.5rem;font-weight:700;color:#111;letter-spacing:-0.025em}
        .nb-section-sub{font-size:0.875rem;color:#6b7280}
        .nb-see-all{font-size:0.85rem;color:#f97316;text-decoration:none;font-weight:600;transition:opacity .2s}
        .nb-see-all:hover{opacity:0.8}
        .nb-cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .nb-cat-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:1.75rem 0.5rem;background:#fff;border:1px solid #e5e7eb;border-radius:14px;cursor:pointer;font-family:inherit;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        .nb-cat-card:hover{background:#fff7ed;border-color:#f97316;transform:translateY(-2px)}
        .nb-cat-icon{font-size:2.25rem}
        .nb-cat-name{font-size:0.875rem;font-weight:600;color:#374151}
        .nb-biz-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .nb-biz-card{text-decoration:none;color:inherit;cursor:pointer;position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px;transition:border-color .2s,transform .2s;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        .nb-biz-card:hover{border-color:#f97316;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1)}
        .nb-featured-badge{position:absolute;top:10px;right:10px;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(245,200,66,0.15);color:#f5c842;border:1px solid rgba(245,200,66,0.3)}
        .nb-featured-pro{background:rgba(192,132,252,0.15);color:#c084fc;border-color:rgba(192,132,252,0.3)}
        .nb-biz-logo{width:52px;height:52px;border-radius:12px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.15);display:flex;align-items:center;justify-content:center;font-size:1.5rem;overflow:hidden}
        .nb-biz-logo img{width:100%;height:100%;object-fit:cover}
        .nb-biz-name{font-size:0.95rem;font-weight:700;color:#111}
        .nb-biz-meta{font-size:0.78rem;color:#6b7280}
        .nb-biz-city{font-size:0.78rem;color:#52525b}
        .nb-biz-footer{margin-top:auto}
        .nb-verified{font-size:0.72rem;font-weight:600;color:#22c55e;background:rgba(34,197,94,0.1);padding:3px 8px;border-radius:6px;border:1px solid rgba(34,197,94,0.2)}
        .nb-verified-pro{color:#c084fc;background:rgba(192,132,252,0.1);border-color:rgba(192,132,252,0.2)}
        .nb-how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;position:relative}
        .nb-how-card{position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.75rem 1.5rem;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        .nb-how-num{font-size:0.72rem;font-weight:800;color:#f5c842;letter-spacing:0.05em}
        .nb-how-icon{font-size:2rem}
        .nb-how-title{font-size:1.05rem;font-weight:700;color:#111}
        .nb-how-desc{font-size:0.82rem;color:#6b7280;line-height:1.6}
        .nb-how-arrow{position:absolute;right:-20px;top:50%;transform:translateY(-50%);font-size:1.2rem;color:#52525b;z-index:1}
        .nb-job-cta{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;text-decoration:none;background:#faf5ff;border:1px solid #e9d5ff;border-radius:16px;padding:1.1rem 1.4rem;margin-bottom:1.25rem;transition:border-color .2s}
        .nb-job-cta:hover{border-color:#a855f7}
        .nb-job-title{font-size:1.05rem;font-weight:800;color:#111}
        .nb-job-sub{font-size:0.85rem;color:#52525b;margin-top:4px;line-height:1.5}
        .nb-job-btn{padding:0.65rem 1.2rem;background:#7c3aed;color:#fff;border-radius:10px;font-weight:700;font-size:0.88rem;white-space:nowrap}
        .nb-pro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .nb-pro-card{text-decoration:none;color:inherit;cursor:pointer;position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px;transition:border-color .2s,transform .2s;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        .nb-pro-card:hover{border-color:#a855f7;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1)}
        .nb-pro-photo{width:52px;height:52px;border-radius:50%;background:rgba(192,132,252,0.1);border:1.5px solid rgba(192,132,252,0.2);display:flex;align-items:center;justify-content:center;font-size:1.5rem;overflow:hidden}
        .nb-pro-photo img{width:100%;height:100%;object-fit:cover}
        .nb-pro-name{font-size:0.95rem;font-weight:700;color:#111}
        .nb-pro-prof{font-size:0.78rem;color:#c084fc}
        .nb-pro-city{font-size:0.78rem;color:#52525b}
        .nb-pro-price{font-size:0.82rem;font-weight:600;color:#f5c842}
        .nb-pro-footer{margin-top:auto}
        .nb-cta{padding:5rem 0;background:#f8f9fa}
        .nb-cta-box{position:relative;background:#0a0a0a;border:1px solid rgba(245,200,66,0.15);border-radius:20px;padding:3.5rem 2rem;text-align:center;overflow:hidden}
        .nb-cta-glow{position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 50% 50%,rgba(245,200,66,0.08),transparent 70%);pointer-events:none}
        .nb-cta-title{font-size:2rem;font-weight:800;color:#fff;letter-spacing:-0.025em;margin-bottom:0.75rem}
        .nb-cta-sub{font-size:0.95rem;color:#78716c;margin-bottom:2rem}
        .nb-cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .nb-cta-btn-primary{padding:0.75rem 2rem;background:#f5c842;color:#0a0a0a;font-size:0.9rem;font-weight:700;border-radius:10px;text-decoration:none;transition:background .2s,transform .15s}
        .nb-cta-btn-primary:hover{background:#e6b93a;transform:translateY(-1px)}
        .nb-cta-btn-secondary{padding:0.75rem 2rem;background:transparent;color:#f5c842;font-size:0.9rem;font-weight:600;border-radius:10px;text-decoration:none;border:1px solid rgba(245,200,66,0.3);transition:all .2s}
        .nb-cta-btn-secondary:hover{background:rgba(245,200,66,0.08)}
        .nb-loading-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .nb-skeleton{height:160px;background:#e5e7eb;border-radius:14px;animation:pulse 1.5s ease-in-out infinite}
        .nb-skeleton-pro{height:140px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .nb-empty-state{text-align:center;padding:3rem;color:#6b7280;font-size:0.9rem;background:#fff;border:1px dashed #d1d5db;border-radius:14px}
        .nb-prod-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .nb-mode{display:inline-flex;gap:4px;padding:4px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px}
        .nb-mode button{padding:0.5rem 1.1rem;border:none;border-radius:9px;background:transparent;color:#52525b;font-weight:700;font-size:0.9rem;cursor:pointer;font-family:inherit}
        .nb-mode button.on{background:#fff;color:#111;box-shadow:0 1px 4px rgba(0,0,0,0.12)}
        .nb-tag-strong{background:#7c3aed!important;color:#fff!important;border-color:#7c3aed!important}
        .nb-prod-card{position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;text-decoration:none;transition:border-color .2s,transform .2s;display:block;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        .nb-prod-card:hover{border-color:#f97316;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1)}
        .nb-prod-img{height:140px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden}
        .nb-prod-img img{width:100%;height:100%;object-fit:cover}
        .nb-prod-info{padding:0.75rem}
        .nb-prod-name{font-size:0.82rem;font-weight:600;color:#111;margin-bottom:2px}
        .nb-prod-price{font-size:0.88rem;font-weight:800;color:#111;margin-top:4px}
        .nb-prod-old{font-size:0.75rem;font-weight:500;color:#9ca3af;text-decoration:line-through;margin-right:6px}
        .nb-prod-shops{font-size:0.72rem;color:#6b7280;margin-top:2px}
        .nb-prod-offer{position:absolute;top:8px;left:8px;z-index:1;background:#f5c842;color:#111;font-size:0.65rem;font-weight:800;padding:2px 8px;border-radius:6px}
        .nb-prod-cat{font-size:0.72rem;color:#f97316;font-weight:500;margin-bottom:2px}
        .nb-prod-brand{font-size:0.7rem;color:#9ca3af}
        .nb-footer{padding:2rem 0;border-top:1px solid #e5e7eb;background:#fff}
        .nb-footer-row{display:flex;align-items:center;justify-content:space-between}
        .nb-footer-logo{font-size:1rem;font-weight:800;color:#111}
        .nb-footer-logo span{color:#f5c842}
        .nb-footer-copy{font-size:0.78rem;color:#9ca3af}
        @media(max-width:900px){.nb-biz-grid,.nb-pro-grid,.nb-how-grid,.nb-loading-row{grid-template-columns:repeat(2,1fr)}.nb-how-arrow{display:none}.nb-prod-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.nb-nav{padding:0 1rem}.nb-nav-link{display:none}.nb-hero{padding:5rem 1rem 3rem}.nb-cat-grid{grid-template-columns:repeat(2,1fr)}.nb-biz-grid,.nb-pro-grid,.nb-how-grid,.nb-loading-row,.nb-prod-grid{grid-template-columns:repeat(2,1fr)}.nb-cta-title{font-size:1.5rem}}
      `}</style>
    </main>
  );
}
