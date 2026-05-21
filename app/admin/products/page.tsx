"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  getDocs,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getCountFromServer,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getSubcategories } from "@/lib/firebase/firestore";
import { Product } from "@/types";
import Link from "next/link";

// ---------------------------------------------------------------------------
const CATEGORIES = ["Të gjitha", "Hidraulikë", "Elektrik", "Ndërtim", "Bojëra & Kimikate", "Kopshtari"];
const CAT_ICONS: Record<string, string> = {
  "Hidraulikë": "🔧", "Elektrik": "⚡", "Ndërtim": "🏗️",
  "Bojëra & Kimikate": "🎨", "Kopshtari": "🌿",
};
const PAGE_SIZE = 100;

function buildConstraints(cat: string, subcat: string, search: string): QueryConstraint[] {
  const c: QueryConstraint[] = [];
  if (cat !== "Të gjitha") c.push(where("category", "==", cat));
  if (subcat !== "Të gjitha") c.push(where("subcategory", "==", subcat));
  if (search.trim()) {
    const s = search.trim();
    const end = s.slice(0, -1) + String.fromCharCode(s.charCodeAt(s.length - 1) + 1);
    c.push(where("name", ">=", s), where("name", "<", end));
  }
  return c;
}
// ---------------------------------------------------------------------------

export default function AdminProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [cat, setCat]                 = useState("Të gjitha");
  const [subcat, setSubcat]           = useState("Të gjitha");
  const [subcats, setSubcats]         = useState<{ id: string; name: string }[]>([]);

  // Pagination
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDoc,  setLastDoc]  = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount,  setTotalCount]  = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (
    direction: "first" | "next" | "prev",
    cursor?: QueryDocumentSnapshot<DocumentData> | null,
    page?: number
  ) => {
    direction === "first" ? setLoading(true) : setLoadingPage(true);
    try {
      const base = buildConstraints(cat, subcat, search);
      // orderBy: name when searching (required for range), createdAt otherwise
      const withOrder: QueryConstraint[] = search.trim()
        ? [...base, orderBy("name")]
        : [...base, orderBy("createdAt", "desc")];

      // Count on first load
      if (direction === "first") {
        try {
          const cq = query(collection(db, "products"), ...base);
          const cs = await getCountFromServer(cq);
          setTotalCount(cs.data().count);
        } catch { setTotalCount(null); }
      }

      // Page constraints
      let pageC: QueryConstraint[];
      if (direction === "next" && cursor)
        pageC = [...withOrder, startAfter(cursor), limit(PAGE_SIZE)];
      else if (direction === "prev" && cursor)
        pageC = [...withOrder, endBefore(cursor), limitToLast(PAGE_SIZE)];
      else
        pageC = [...withOrder, limit(PAGE_SIZE)];

      const snap = await getDocs(query(collection(db, "products"), ...pageC));
      const docs = snap.docs;
      setProducts(docs.map(d => ({ id: d.id, ...d.data() } as Product)));

      if (docs.length > 0) { setFirstDoc(docs[0]); setLastDoc(docs[docs.length - 1]); }

      // Prev availability
      const pg = page ?? currentPage;
      setHasPrev(direction === "next" ? true : direction === "prev" ? pg > 2 : false);

      // Next availability — peek 1 doc ahead
      if (docs.length === PAGE_SIZE) {
        const pk = await getDocs(query(collection(db, "products"), ...withOrder, startAfter(docs[docs.length - 1]), limit(1)));
        setHasNext(pk.docs.length > 0);
      } else { setHasNext(false); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingPage(false); }
  }, [cat, subcat, search, currentPage]);

  // Reset on filter change
  useEffect(() => {
    setCurrentPage(1); setFirstDoc(null); setLastDoc(null); setHasPrev(false);
    fetchPage("first");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, subcat, search]);

  // Subcategories
  useEffect(() => {
    setSubcat("Të gjitha");
    if (cat === "Të gjitha") { setSubcats([]); return; }
    getSubcategories(cat).then(setSubcats);
  }, [cat]);

  // Debounce search
  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  // Toggle status
  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    await updateDoc(doc(db, "products", id), { status: next });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: next as "active" | "inactive" } : p));
  };

  // Pagination handlers
  const goNext = () => {
    const pg = currentPage + 1;
    setCurrentPage(pg);
    fetchPage("next", lastDoc, pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goPrev = () => {
    const pg = Math.max(1, currentPage - 1);
    setCurrentPage(pg);
    fetchPage("prev", firstDoc, pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = totalCount !== null ? Math.ceil(totalCount / PAGE_SIZE) : null;
  const showing = products.length;
  const from = (currentPage - 1) * PAGE_SIZE + 1;
  const to   = (currentPage - 1) * PAGE_SIZE + showing;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Produktet</h1>
            <p>
              {totalCount !== null
                ? `${totalCount.toLocaleString()} produkte gjithsej`
                : loading ? "Duke ngarkuar..." : `${products.length} produkte`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/admin/products/import" className="adm-btn-secondary">⬆ Import CSV</Link>
            <Link href="/admin/products/new"    className="adm-btn-primary">+ Shto produkt</Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="adm-search-bar">
        <span className="adm-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Kërko produkte... (prefix)"
          value={searchInput}
          onChange={e => handleSearch(e.target.value)}
          className="adm-search-input"
        />
        {searchInput && (
          <button className="adm-search-clear" onClick={() => { setSearchInput(""); setSearch(""); }}>✕</button>
        )}
      </div>

      {/* Category tabs */}
      <div className="adm-cats">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`adm-cat-btn ${cat === c ? "active" : ""}`}>
            {CAT_ICONS[c] && <span>{CAT_ICONS[c]} </span>}{c}
          </button>
        ))}
      </div>

      {/* Subcategory tabs */}
      {subcats.length > 0 && (
        <div className="adm-subcats">
          <button onClick={() => setSubcat("Të gjitha")} className={`adm-subcat-btn ${subcat === "Të gjitha" ? "active" : ""}`}>
            Të gjitha
          </button>
          {subcats.map(s => (
            <button key={s.id} onClick={() => setSubcat(s.name)} className={`adm-subcat-btn ${subcat === s.name ? "active" : ""}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Meta row */}
      {!loading && products.length > 0 && (
        <div className="adm-meta-row">
          <span className="adm-meta-text">
            Duke shfaqur {from}–{to}
            {totalCount !== null ? ` nga ${totalCount.toLocaleString()}` : ""}
            {cat !== "Të gjitha" ? ` · ${cat}` : ""}
          </span>
          <span className="adm-meta-text">
            Faqja {currentPage}{totalPages ? ` / ${totalPages}` : ""}
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="adm-loading">Duke ngarkuar produktet...</div>
      ) : products.length === 0 ? (
        <div className="adm-empty">
          <p>😕 Nuk u gjet asnjë produkt</p>
          <button className="adm-btn-secondary" style={{ marginTop: "1rem", cursor: "pointer" }}
            onClick={() => { setSearchInput(""); setSearch(""); setCat("Të gjitha"); setSubcat("Të gjitha"); }}>
            Pastro filtrat
          </button>
        </div>
      ) : (
        <>
          <div className="adm-table-wrap" style={{ opacity: loadingPage ? 0.5 : 1, transition: "opacity .2s" }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Produkti</th>
                  <th>Kategoria</th>
                  <th>Marka</th>
                  <th>Statusi</th>
                  <th>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="adm-product-cell">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.name} className="adm-product-img" />
                          : <div className="adm-product-img adm-product-placeholder">🛍</div>}
                        <div>
                          <p className="adm-product-name">{p.name}</p>
                          <p className="adm-product-desc">{p.description?.slice(0, 50)}{p.description && p.description.length > 50 ? "..." : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="adm-badge">{p.category}</span>
                      {p.subcategory && <span className="adm-badge adm-badge-sub">{p.subcategory}</span>}
                    </td>
                    <td><span className="adm-text-muted">{p.brand || "—"}</span></td>
                    <td>
                      <button
                        onClick={() => toggleStatus(p.id, p.status)}
                        className={`adm-status-btn ${p.status === "active" ? "active" : "inactive"}`}
                      >
                        {p.status === "active" ? "● Aktiv" : "○ Joaktiv"}
                      </button>
                    </td>
                    <td>
                      <div className="adm-actions-cell">
                        <Link href={`/admin/products/${p.id}/edit`} className="adm-action-link">Edito</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="adm-pagination">
            <button onClick={goPrev} disabled={!hasPrev || loadingPage} className="adm-page-btn">
              ← Para
            </button>
            <span className="adm-page-info">
              {loadingPage
                ? <span className="adm-spin" />
                : `Faqja ${currentPage}${totalPages ? ` / ${totalPages}` : ""}`}
            </span>
            <button onClick={goNext} disabled={!hasNext || loadingPage} className="adm-page-btn">
              Pas →
            </button>
          </div>
        </>
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.5rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-btn-primary{padding:0.6rem 1.2rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s;white-space:nowrap;font-family:inherit}
        .adm-btn-primary:hover{background:#ea6c0a}
        .adm-btn-secondary{padding:0.6rem 1.2rem;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;border-radius:10px;font-size:0.875rem;font-weight:500;cursor:pointer;text-decoration:none;transition:all .2s;white-space:nowrap;font-family:inherit}
        .adm-btn-secondary:hover{border-color:rgba(255,255,255,0.2);color:#e4e4e7}

        /* Search */
        .adm-search-bar{display:flex;align-items:center;gap:10px;background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0 14px;margin-bottom:1rem;position:relative}
        .adm-search-icon{color:#52525b;font-size:0.9rem}
        .adm-search-input{flex:1;background:none;border:none;outline:none;padding:0.7rem 0;color:#f4f4f5;font-size:0.875rem;font-family:inherit}
        .adm-search-input::placeholder{color:#3f3f46}
        .adm-search-clear{background:none;border:none;color:#52525b;cursor:pointer;font-size:0.85rem;padding:4px 8px;margin-left:auto}
        .adm-search-clear:hover{color:#a1a1aa}

        /* Category tabs */
        .adm-cats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:0.75rem}
        .adm-cat-btn{padding:0.4rem 0.9rem;border-radius:999px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.8rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-cat-btn:hover{background:rgba(255,255,255,0.04);color:#e4e4e7}
        .adm-cat-btn.active{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}

        /* Subcategory tabs */
        .adm-subcats{display:flex;gap:5px;flex-wrap:wrap;padding:0.6rem 0.75rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:0.75rem}
        .adm-subcat-btn{padding:0.3rem 0.75rem;border-radius:999px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#52525b;font-size:0.73rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-subcat-btn:hover{background:rgba(255,255,255,0.04);color:#a1a1aa}
        .adm-subcat-btn.active{background:rgba(249,115,22,0.1);border-color:rgba(249,115,22,0.25);color:#f97316}

        /* Meta */
        .adm-meta-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem}
        .adm-meta-text{font-size:0.75rem;color:#52525b}

        /* Table */
        .adm-loading,.adm-empty{text-align:center;padding:3rem;color:#71717a;font-size:0.9rem}
        .adm-table-wrap{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden}
        .adm-table{width:100%;border-collapse:collapse}
        .adm-table th{padding:0.75rem 1rem;text-align:left;font-size:0.75rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .adm-table td{padding:0.85rem 1rem;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:middle}
        .adm-table tr:last-child td{border-bottom:none}
        .adm-table tr:hover td{background:rgba(255,255,255,0.02)}
        .adm-product-cell{display:flex;align-items:center;gap:12px}
        .adm-product-img{width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0}
        .adm-product-placeholder{background:rgba(249,115,22,0.1);display:flex;align-items:center;justify-content:center;font-size:1.1rem}
        .adm-product-name{font-size:0.875rem;font-weight:600;color:#e4e4e7;margin-bottom:2px}
        .adm-product-desc{font-size:0.75rem;color:#71717a}
        .adm-badge{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:2px 8px;font-size:0.75rem;color:#a1a1aa;display:inline-block}
        .adm-badge-sub{margin-left:4px;background:rgba(249,115,22,0.07);border-color:rgba(249,115,22,0.15);color:#f97316}
        .adm-text-muted{font-size:0.85rem;color:#71717a}
        .adm-status-btn{border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-status-btn.active{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-status-btn.inactive{background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
        .adm-actions-cell{display:flex;gap:8px}
        .adm-action-link{font-size:0.8rem;color:#f97316;text-decoration:none;font-weight:500}
        .adm-action-link:hover{text-decoration:underline}

        /* Pagination */
        .adm-pagination{display:flex;align-items:center;justify-content:center;gap:1.5rem;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(255,255,255,0.06)}
        .adm-page-btn{padding:0.55rem 1.4rem;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:10px;color:#f97316;font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-page-btn:hover:not(:disabled){background:rgba(249,115,22,0.15)}
        .adm-page-btn:disabled{opacity:0.3;cursor:not-allowed}
        .adm-page-info{font-size:0.82rem;color:#71717a;min-width:110px;text-align:center}
        .adm-spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:adm-spin .7s linear infinite}
        @keyframes adm-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
