"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestion = (s: string) => {
    router.push(`/search?q=${encodeURIComponent(s)}`);
  };

  return (
    <main className="nb-home">
      {/* Navbar */}
      <nav className="nb-nav">
        <Link href="/" className="nb-logo">Near<span>Buy</span>.al</Link>
        <div className="nb-nav-actions">
          <Link href="/auth/login" className="nb-nav-login">Hyr</Link>
          <Link href="/auth/register" className="nb-nav-register">Regjistrohu</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="nb-hero">
        <div className="nb-hero-glow" />
        <div className="nb-hero-content">
          <h1 className="nb-hero-title">
            Gjej produktin që dëshiron<br />
            <span className="nb-hero-accent">afër teje, çmimi më i mirë.</span>
          </h1>
          <p className="nb-hero-sub">
            Kërko produkte dhe profesionistë afër teje në gjithë Shqipërinë
          </p>

          <form onSubmit={handleSearch} className="nb-search">
            <div className="nb-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Kërko produkte, shërbime..."
              className="nb-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className="nb-search-btn">Kërko</button>
          </form>

          <div className="nb-tags">
            {["Elektriçistë", "Hidraulikë", "Mobilje", "Elektronikë", "Rrobaqepës"].map((tag) => (
              <button key={tag} onClick={() => handleSuggestion(tag)} className="nb-tag">{tag}</button>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .nb-home { min-height: 100vh; background: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #f5f5f4; }
        .nb-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; height: 64px; background: rgba(10,10,10,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nb-logo { font-size: 1.2rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; text-decoration: none; }
        .nb-logo span { color: #f5c842; }
        .nb-nav-actions { display: flex; align-items: center; gap: 12px; }
        .nb-nav-login { padding: 0.45rem 1.1rem; color: #a8a29e; font-size: 0.875rem; font-weight: 500; border-radius: 8px; text-decoration: none; transition: color 0.2s; }
        .nb-nav-login:hover { color: #fff; }
        .nb-nav-register { padding: 0.45rem 1.2rem; background: #f5c842; color: #0a0a0a; font-size: 0.875rem; font-weight: 700; border-radius: 8px; text-decoration: none; transition: background 0.2s, transform 0.15s; }
        .nb-nav-register:hover { background: #e6b93a; transform: translateY(-1px); }
        .nb-hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 6rem 2rem 4rem; }
        .nb-hero-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,200,66,0.07) 0%, transparent 70%); }
        .nb-hero-content { position: relative; z-index: 1; text-align: center; max-width: 760px; width: 100%; }
        .nb-hero-title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; color: #fff; margin-bottom: 1.25rem; }
        .nb-hero-accent { color: #f5c842; display: block; }
        .nb-hero-sub { font-size: 1rem; color: #78716c; margin-bottom: 2.5rem; line-height: 1.6; }
        .nb-search { display: flex; align-items: center; background: #1c1c1c; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; overflow: hidden; max-width: 580px; margin: 0 auto 1.5rem; transition: border-color 0.2s, box-shadow 0.2s; }
        .nb-search:focus-within { border-color: rgba(245,200,66,0.4); box-shadow: 0 0 0 3px rgba(245,200,66,0.08); }
        .nb-search-icon { padding: 0 14px; color: #52524e; flex-shrink: 0; display: flex; align-items: center; }
        .nb-search-input { flex: 1; padding: 1rem 0.5rem; background: transparent; border: none; outline: none; color: #f5f5f4; font-size: 0.95rem; font-family: inherit; }
        .nb-search-input::placeholder { color: #44403c; }
        .nb-search-btn { margin: 6px; padding: 0.65rem 1.4rem; background: #f5c842; color: #0a0a0a; font-size: 0.875rem; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s, transform 0.15s; white-space: nowrap; font-family: inherit; }
        .nb-search-btn:hover { background: #e6b93a; transform: translateY(-1px); }
        .nb-tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .nb-tag { padding: 0.4rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; font-size: 0.8rem; color: #a8a29e; cursor: pointer; font-family: inherit; transition: background 0.2s, border-color 0.2s, color 0.2s; }
        .nb-tag:hover { background: rgba(245,200,66,0.1); border-color: rgba(245,200,66,0.3); color: #f5c842; }
        @media (max-width: 640px) { .nb-nav { padding: 0 1rem; } .nb-hero { padding: 5rem 1rem 3rem; } }
      `}</style>
    </main>
  );
}
