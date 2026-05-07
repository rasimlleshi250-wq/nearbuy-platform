"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Product } from "@/types";
import Link from "next/link";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    await updateDoc(doc(db, "products", id), { status: next });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: next as "active" | "inactive" } : p));
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Produktet</h1>
            <p>{products.length} produkte gjithsej</p>
          </div>
          <Link href="/admin/products/new" className="adm-btn-primary">
            + Shto produkt
          </Link>
        </div>
      </div>

      <div className="adm-search-bar">
        <span className="adm-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Kërko produkte..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="adm-search-input"
        />
      </div>

      {loading ? (
        <div className="adm-loading">Duke ngarkuar produktet...</div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          <p>😕 Nuk u gjet asnjë produkt</p>
          <Link href="/admin/products/new" className="adm-btn-primary" style={{ display: "inline-block", marginTop: "1rem" }}>
            Shto produktin e parë
          </Link>
        </div>
      ) : (
        <div className="adm-table-wrap">
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
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="adm-product-cell">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="adm-product-img" />
                      ) : (
                        <div className="adm-product-img adm-product-placeholder">🛍</div>
                      )}
                      <div>
                        <p className="adm-product-name">{p.name}</p>
                        <p className="adm-product-desc">{p.description?.slice(0, 50)}...</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="adm-badge">{p.category}</span></td>
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
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.5rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-btn-primary{padding:0.6rem 1.2rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s;white-space:nowrap;font-family:inherit}
        .adm-btn-primary:hover{background:#ea6c0a}
        .adm-search-bar{display:flex;align-items:center;gap:10px;background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0 14px;margin-bottom:1.25rem}
        .adm-search-icon{color:#52525b;font-size:0.9rem}
        .adm-search-input{flex:1;background:none;border:none;outline:none;padding:0.7rem 0;color:#f4f4f5;font-size:0.875rem;font-family:inherit}
        .adm-search-input::placeholder{color:#3f3f46}
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
        .adm-badge{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:2px 8px;font-size:0.75rem;color:#a1a1aa}
        .adm-text-muted{font-size:0.85rem;color:#71717a}
        .adm-status-btn{border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-status-btn.active{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-status-btn.inactive{background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
        .adm-actions-cell{display:flex;gap:8px}
        .adm-action-link{font-size:0.8rem;color:#f97316;text-decoration:none;font-weight:500}
        .adm-action-link:hover{text-decoration:underline}
      `}</style>
    </div>
  );
}
