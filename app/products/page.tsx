"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getSubcategories } from "@/lib/firebase/firestore";

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  images?: string[];
  brand?: string;
  description?: string;
  tags?: string[];
  status: string;
}

const CATEGORIES = ["Të gjitha", "Hidraulikë", "Elektrik", "Ndërtim", "Bojëra"];

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState(searchParams.get("category") || "Të gjitha");
  const [subcatFilter, setSubcatFilter] = useState("Të gjitha");
  const [subcategories, setSubcategories] = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "products"), where("status", "==", "active"));
        const snap = await getDocs(q);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Sync category from URL param
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setCatFilter(cat);
  }, [searchParams]);

  // Ngarko subkategoritë kur ndryshon kategoria
  useEffect(() => {
    setSubcatFilter("Të gjitha");
    if (catFilter === "Të gjitha") { setSubcategories([]); return; }
    getSubcategories(catFilter).then(setSubcategories);
  }, [catFilter]);

  const filtered = products.filter(p => {
    const matchCat = catFilter === "Të gjitha" || p.category === catFilter;
    const matchSubcat = subcatFilter === "Të gjitha" || p.subcategory === subcatFilter;
    const matchSearch = !search.trim() ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSubcat && matchSearch;
  });

  return (
    <div className="pd-root">
      <nav className="pd-nav">
        <Link href="/" className="pd-logo">Near<span>Buy</span>.al</Link>
        <div className="pd-nav-right">
          <Link href="/search" className="pd-nav-link">Biznese</Link>
          <Link href="/professionals" className="pd-nav-link">Profesionistë</Link>
          <Link href="/auth/login" className="pd-nav-login">Hyr</Link>
          <Link href="/auth/register" className="pd-nav-reg">Regjistrohu</Link>
        </div>
      </nav>

      <div className="pd-container">
        <div className="pd-header">
          <h1 className="pd-title">Produktet</h1>
          <p className="pd-sub">Kërko produkte nga bizneset lokale shqiptare</p>
        </div>

        {/* Filters */}
        <div className="pd-filters">
          <div className="pd-search-wrap">
            <svg className="pd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Kërko produkte..." value={search}
              onChange={e => setSearch(e.target.value)} className="pd-search-input" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="pd-cats">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`pd-cat-btn ${catFilter === cat ? "active" : ""}`}>
              {cat === "Hidraulikë" ? "🔧 " : cat === "Elektrik" ? "⚡ " : cat === "Ndërtim" ? "🏗️ " : cat === "Bojëra" ? "🎨 " : ""}
              {cat}
            </button>
          ))}
        </div>

        {/* Subcategory tabs — shfaqen vetem kur ka kategori aktive */}
        {subcategories.length > 0 && (
          <div className="pd-subcats">
            <button onClick={() => setSubcatFilter("Të gjitha")}
              className={`pd-subcat-btn ${subcatFilter === "Të gjitha" ? "active" : ""}`}>
              Të gjitha
            </button>
            {subcategories.map(s => (
              <button key={s.id} onClick={() => setSubcatFilter(s.name)}
                className={`pd-subcat-btn ${subcatFilter === s.name ? "active" : ""}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}

        <p className="pd-count">{loading ? "Duke ngarkuar..." : `${filtered.length} produkte`}{catFilter !== "Të gjitha" ? ` në ${catFilter}` : ""}</p>

        {loading ? (
          <div className="pd-grid">
            {[...Array(8)].map((_, i) => <div key={i} className="pd-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pd-empty">
            <span>📦</span>
            <p>Nuk u gjetën produkte për këtë kërkim.</p>
            <button onClick={() => { setSearch(""); setCatFilter("Të gjitha"); setSubcatFilter("Të gjitha"); }} className="pd-reset">
              Pastro filtrat
            </button>
          </div>
        ) : (
          <div className="pd-grid">
            {filtered.map(p => (
              <Link key={p.id} href={`/products/${p.id}`} className="pd-card">
                <div className="pd-img">
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span>📦</span>}
                </div>
                <div className="pd-info">
                  <p className="pd-name">{p.name}</p>
                  <p className="pd-cat">{p.category}</p>
                  {p.brand && <p className="pd-brand">{p.brand}</p>}
                  {p.description && <p className="pd-desc">{p.description.slice(0, 80)}{p.description.length > 80 ? "..." : ""}</p>}
                  {p.tags && p.tags.length > 0 && (
                    <div className="pd-tags">
                      {p.tags.slice(0, 3).map(t => <span key={t} className="pd-tag">{t}</span>)}
                    </div>
                  )}
                  <span className="pd-find-btn">🏪 Shiko detajet</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .pd-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .pd-nav{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:60px;background:rgba(10,10,10,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .pd-logo{font-size:1.1rem;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.02em}
        .pd-logo span{color:#f5c842}
        .pd-nav-right{display:flex;align-items:center;gap:10px}
        .pd-nav-link{font-size:0.85rem;color:#a1a1aa;text-decoration:none;padding:0.4rem 0.8rem;transition:color .2s}
        .pd-nav-link:hover{color:#fff}
        .pd-nav-login{font-size:0.85rem;color:#a1a1aa;text-decoration:none;padding:0.4rem 0.8rem}
        .pd-nav-reg{font-size:0.85rem;font-weight:700;color:#0a0a0a;background:#f5c842;padding:0.4rem 1rem;border-radius:8px;text-decoration:none}
        .pd-container{max-width:1100px;margin:0 auto;padding:2rem 1.5rem}
        .pd-header{margin-bottom:1.75rem}
        .pd-title{font-size:1.75rem;font-weight:800;color:#fff;letter-spacing:-0.025em}
        .pd-sub{font-size:0.875rem;color:#71717a;margin-top:4px}
        .pd-filters{margin-bottom:1rem}
        .pd-search-wrap{position:relative;max-width:500px}
        .pd-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none}
        .pd-search-input{width:100%;padding:0.7rem 0.9rem 0.7rem 2.25rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;outline:none;font-family:inherit;transition:border-color .2s}
        .pd-search-input:focus{border-color:rgba(245,200,66,0.4)}
        .pd-search-input::placeholder{color:#3f3f46}
        .pd-subcats{display:flex;gap:6px;margin-bottom:1.25rem;flex-wrap:wrap;padding:0.75rem;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.05)}
        .pd-subcat-btn{padding:0.35rem 0.85rem;border-radius:999px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#52525b;font-size:0.75rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .pd-subcat-btn:hover{background:rgba(255,255,255,0.04);color:#a1a1aa}
        .pd-subcat-btn.active{background:rgba(249,115,22,0.1);border-color:rgba(249,115,22,0.25);color:#f97316}
        .pd-cats{display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap}
        .pd-cat-btn{padding:0.5rem 1rem;border-radius:999px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.82rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .pd-cat-btn:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .pd-cat-btn.active{background:rgba(245,200,66,0.12);border-color:rgba(245,200,66,0.3);color:#f5c842}
        .pd-count{font-size:0.78rem;color:#52525b;margin-bottom:1.25rem}
        .pd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
        .pd-skeleton{height:260px;background:rgba(255,255,255,0.04);border-radius:14px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .pd-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:4rem;color:#52525b;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.07);border-radius:14px;text-align:center}
        .pd-empty span{font-size:2.5rem}
        .pd-reset{padding:0.5rem 1.25rem;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#a1a1aa;font-size:0.82rem;cursor:pointer;font-family:inherit}
        .pd-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;transition:border-color .2s,transform .2s;display:flex;flex-direction:column}
        .pd-card:hover{border-color:rgba(245,200,66,0.25);transform:translateY(-2px)}
        .pd-img{height:160px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden;flex-shrink:0}
        .pd-img img{width:100%;height:100%;object-fit:cover}
        .pd-info{padding:0.9rem;display:flex;flex-direction:column;gap:4px;flex:1}
        .pd-name{font-size:0.875rem;font-weight:700;color:#e4e4e7}
        .pd-cat{font-size:0.72rem;color:#f5c842;font-weight:500}
        .pd-brand{font-size:0.72rem;color:#52525b}
        .pd-desc{font-size:0.75rem;color:#71717a;line-height:1.5;margin-top:2px}
        .pd-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
        .pd-tag{font-size:0.68rem;padding:2px 7px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:999px;color:#71717a}
        .pd-find-btn{display:block;text-align:center;padding:0.55rem;background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.2);border-radius:8px;color:#f5c842;font-size:0.78rem;font-weight:600;text-decoration:none;transition:background .2s;margin-top:auto}
        .pd-find-btn:hover{background:rgba(245,200,66,0.15)}
        @media(max-width:600px){.pd-nav{padding:0 1rem}.pd-nav-link{display:none}}
      `}</style>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(245,200,66,0.2)", borderTopColor: "#f5c842", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
