"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

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

const CATEGORIES = [
  { name: "Hidraulikë", icon: "🔧" },
  { name: "Elektrik", icon: "⚡" },
  { name: "Ndërtim", icon: "🏗️" },
  { name: "Bojëra", icon: "🎨" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Kërko", desc: "Shkruaj produktin ose shërbimin që dëshiron dhe zgjidh qytetin tënd.", icon: "🔍" },
  { step: "02", title: "Krahaso", desc: "Shiko bizneset dhe profesionistët afër teje me çmimet dhe oraret e tyre.", icon: "⚖️" },
  { step: "03", title: "Kontakto", desc: "Kontakto direkt biznesin ose profesionistin që të përshtatet.", icon: "📞" },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [loadingPro, setLoadingPro] = useState(true);

  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const q = query(collection(db, "businesses"), where("verified", "==", true), limit(6));
        const snap = await getDocs(q);
        setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Business)));
      } catch (e) { console.error(e); }
      finally { setLoadingBiz(false); }
    };
    const loadProfessionals = async () => {
      try {
        const q = query(collection(db, "professionals"), where("verified", "==", true), limit(6));
        const snap = await getDocs(q);
        setProfessionals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Professional)));
      } catch (e) { console.error(e); }
      finally { setLoadingPro(false); }
    };
    loadBusinesses();
    loadProfessionals();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
          <div className="nb-hero-badge">🇦🇱 NearBuy.al — Platforma #1 në Shqipëri</div>
          <h1 className="nb-hero-title">
            Gjej produktin që dëshiron<br />
            <span className="nb-hero-accent">afër teje, çmimi më i mirë.</span>
          </h1>
          <p className="nb-hero-sub">Kërko produkte dhe profesionistë afër teje në gjithë Shqipërinë</p>

          <form onSubmit={handleSearch} className="nb-search">
            <div className="nb-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input type="text" placeholder="Kërko produkte, shërbime..." className="nb-search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button type="submit" className="nb-search-btn">Kërko</button>
          </form>

          <div className="nb-tags">
            {["Elektriçistë", "Hidraulikë", "Bojëra", "Ndërtim", "Elektrik"].map(tag => (
              <button key={tag} onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)} className="nb-tag">{tag}</button>
            ))}
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
              <button key={cat.name} onClick={() => router.push(`/search?q=${encodeURIComponent(cat.name)}`)} className="nb-cat-card">
                <span className="nb-cat-icon">{cat.icon}</span>
                <span className="nb-cat-name">{cat.name}</span>
              </button>
            ))}
          </div>
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
                <div key={b.id} className="nb-biz-card">
                  {b.featured && <div className="nb-featured-badge">⭐ Featured</div>}
                  <div className="nb-biz-logo">{b.logo ? <img src={b.logo} alt={b.name} /> : <span>🏪</span>}</div>
                  <div>
                    <p className="nb-biz-name">{b.name}</p>
                    <p className="nb-biz-meta">{b.category}</p>
                    <p className="nb-biz-city">📍 {b.city}</p>
                  </div>
                  <div className="nb-biz-footer"><span className="nb-verified">✓ Verifikuar</span></div>
                </div>
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

      {/* Profesionistët */}
      <section className="nb-section nb-section-dark">
        <div className="nb-container">
          <div className="nb-section-header">
            <h2 className="nb-section-title">Profesionistë të Verifikuar</h2>
            <Link href="/professionals" className="nb-see-all">Shiko të gjitha →</Link>
          </div>
          {loadingPro ? (
            <div className="nb-loading-row">
              {[...Array(3)].map((_, i) => <div key={i} className="nb-skeleton nb-skeleton-pro" />)}
            </div>
          ) : professionals.length === 0 ? (
            <div className="nb-empty-state"><p>👷 Profesionistët e parë do të shfaqen së shpejti!</p></div>
          ) : (
            <div className="nb-pro-grid">
              {professionals.map(p => (
                <div key={p.id} className="nb-pro-card">
                  {p.featured && <div className="nb-featured-badge nb-featured-pro">⭐ Featured</div>}
                  <div className="nb-pro-photo">{p.photo ? <img src={p.photo} alt={p.name} /> : <span>👤</span>}</div>
                  <div>
                    <p className="nb-pro-name">{p.name}</p>
                    <p className="nb-pro-prof">{p.profession}</p>
                    <p className="nb-pro-city">📍 {p.city}</p>
                    {p.pricePerHour && <p className="nb-pro-price">{p.pricePerHour.toLocaleString()} L/orë</p>}
                  </div>
                  <div className="nb-pro-footer"><span className="nb-verified nb-verified-pro">✓ Verifikuar</span></div>
                </div>
              ))}
            </div>
          )}
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
              <Link href="/auth/register" className="nb-cta-btn-primary">Regjistro biznesin →</Link>
              <Link href="/auth/register" className="nb-cta-btn-secondary">Regjistrohu si profesionist</Link>
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
        .nb-home{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .nb-container{max-width:1100px;margin:0 auto;padding:0 1.5rem}
        .nb-nav{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:64px;background:rgba(10,10,10,0.9);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .nb-logo{font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:-0.02em;text-decoration:none}
        .nb-logo span{color:#f5c842}
        .nb-nav-actions{display:flex;align-items:center;gap:12px}
        .nb-nav-link{padding:0.45rem 1rem;color:#a8a29e;font-size:0.875rem;font-weight:500;text-decoration:none;transition:color .2s}
        .nb-nav-link:hover{color:#fff}
        .nb-nav-login{padding:0.45rem 1.1rem;color:#a8a29e;font-size:0.875rem;font-weight:500;border-radius:8px;text-decoration:none;transition:color .2s}
        .nb-nav-login:hover{color:#fff}
        .nb-nav-register{padding:0.45rem 1.2rem;background:#f5c842;color:#0a0a0a;font-size:0.875rem;font-weight:700;border-radius:8px;text-decoration:none;transition:background .2s,transform .15s}
        .nb-nav-register:hover{background:#e6b93a;transform:translateY(-1px)}
        .nb-hero{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:6rem 2rem 4rem}
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
        .nb-section{padding:5rem 0}
        .nb-section-dark{background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05)}
        .nb-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem}
        .nb-section-center{flex-direction:column;align-items:center;text-align:center;gap:8px}
        .nb-section-title{font-size:1.5rem;font-weight:700;color:#fff;letter-spacing:-0.025em}
        .nb-section-sub{font-size:0.875rem;color:#71717a}
        .nb-see-all{font-size:0.85rem;color:#f5c842;text-decoration:none;font-weight:600;transition:opacity .2s}
        .nb-see-all:hover{opacity:0.8}
        .nb-cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .nb-cat-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:1.75rem 0.5rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;cursor:pointer;font-family:inherit;transition:all .2s}
        .nb-cat-card:hover{background:rgba(245,200,66,0.08);border-color:rgba(245,200,66,0.25);transform:translateY(-2px)}
        .nb-cat-icon{font-size:2.25rem}
        .nb-cat-name{font-size:0.875rem;font-weight:600;color:#a1a1aa}
        .nb-biz-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .nb-biz-card{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px;transition:border-color .2s,transform .2s}
        .nb-biz-card:hover{border-color:rgba(245,200,66,0.25);transform:translateY(-2px)}
        .nb-featured-badge{position:absolute;top:10px;right:10px;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(245,200,66,0.15);color:#f5c842;border:1px solid rgba(245,200,66,0.3)}
        .nb-featured-pro{background:rgba(192,132,252,0.15);color:#c084fc;border-color:rgba(192,132,252,0.3)}
        .nb-biz-logo{width:52px;height:52px;border-radius:12px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.15);display:flex;align-items:center;justify-content:center;font-size:1.5rem;overflow:hidden}
        .nb-biz-logo img{width:100%;height:100%;object-fit:cover}
        .nb-biz-name{font-size:0.95rem;font-weight:700;color:#f4f4f5}
        .nb-biz-meta{font-size:0.78rem;color:#71717a}
        .nb-biz-city{font-size:0.78rem;color:#52525b}
        .nb-biz-footer{margin-top:auto}
        .nb-verified{font-size:0.72rem;font-weight:600;color:#22c55e;background:rgba(34,197,94,0.1);padding:3px 8px;border-radius:6px;border:1px solid rgba(34,197,94,0.2)}
        .nb-verified-pro{color:#c084fc;background:rgba(192,132,252,0.1);border-color:rgba(192,132,252,0.2)}
        .nb-how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;position:relative}
        .nb-how-card{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.75rem 1.5rem;display:flex;flex-direction:column;gap:10px}
        .nb-how-num{font-size:0.72rem;font-weight:800;color:#f5c842;letter-spacing:0.05em}
        .nb-how-icon{font-size:2rem}
        .nb-how-title{font-size:1.05rem;font-weight:700;color:#fff}
        .nb-how-desc{font-size:0.82rem;color:#71717a;line-height:1.6}
        .nb-how-arrow{position:absolute;right:-20px;top:50%;transform:translateY(-50%);font-size:1.2rem;color:#52525b;z-index:1}
        .nb-pro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .nb-pro-card{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px;transition:border-color .2s,transform .2s}
        .nb-pro-card:hover{border-color:rgba(192,132,252,0.25);transform:translateY(-2px)}
        .nb-pro-photo{width:52px;height:52px;border-radius:50%;background:rgba(192,132,252,0.1);border:1.5px solid rgba(192,132,252,0.2);display:flex;align-items:center;justify-content:center;font-size:1.5rem;overflow:hidden}
        .nb-pro-photo img{width:100%;height:100%;object-fit:cover}
        .nb-pro-name{font-size:0.95rem;font-weight:700;color:#f4f4f5}
        .nb-pro-prof{font-size:0.78rem;color:#c084fc}
        .nb-pro-city{font-size:0.78rem;color:#52525b}
        .nb-pro-price{font-size:0.82rem;font-weight:600;color:#f5c842}
        .nb-pro-footer{margin-top:auto}
        .nb-cta{padding:5rem 0}
        .nb-cta-box{position:relative;background:rgba(245,200,66,0.05);border:1px solid rgba(245,200,66,0.15);border-radius:20px;padding:3.5rem 2rem;text-align:center;overflow:hidden}
        .nb-cta-glow{position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 50% 50%,rgba(245,200,66,0.08),transparent 70%);pointer-events:none}
        .nb-cta-title{font-size:2rem;font-weight:800;color:#fff;letter-spacing:-0.025em;margin-bottom:0.75rem}
        .nb-cta-sub{font-size:0.95rem;color:#78716c;margin-bottom:2rem}
        .nb-cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .nb-cta-btn-primary{padding:0.75rem 2rem;background:#f5c842;color:#0a0a0a;font-size:0.9rem;font-weight:700;border-radius:10px;text-decoration:none;transition:background .2s,transform .15s}
        .nb-cta-btn-primary:hover{background:#e6b93a;transform:translateY(-1px)}
        .nb-cta-btn-secondary{padding:0.75rem 2rem;background:transparent;color:#f5c842;font-size:0.9rem;font-weight:600;border-radius:10px;text-decoration:none;border:1px solid rgba(245,200,66,0.3);transition:all .2s}
        .nb-cta-btn-secondary:hover{background:rgba(245,200,66,0.08)}
        .nb-loading-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .nb-skeleton{height:160px;background:rgba(255,255,255,0.04);border-radius:14px;animation:pulse 1.5s ease-in-out infinite}
        .nb-skeleton-pro{height:140px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .nb-empty-state{text-align:center;padding:3rem;color:#52525b;font-size:0.9rem;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.07);border-radius:14px}
        .nb-footer{padding:2rem 0;border-top:1px solid rgba(255,255,255,0.06)}
        .nb-footer-row{display:flex;align-items:center;justify-content:space-between}
        .nb-footer-logo{font-size:1rem;font-weight:800;color:#fff}
        .nb-footer-logo span{color:#f5c842}
        .nb-footer-copy{font-size:0.78rem;color:#52525b}
        @media(max-width:900px){.nb-biz-grid,.nb-pro-grid,.nb-how-grid,.nb-loading-row{grid-template-columns:repeat(2,1fr)}.nb-how-arrow{display:none}}
        @media(max-width:600px){.nb-nav{padding:0 1rem}.nb-nav-link{display:none}.nb-hero{padding:5rem 1rem 3rem}.nb-cat-grid{grid-template-columns:repeat(2,1fr)}.nb-biz-grid,.nb-pro-grid,.nb-how-grid,.nb-loading-row{grid-template-columns:1fr}.nb-cta-title{font-size:1.5rem}}
      `}</style>
    </main>
  );
}
