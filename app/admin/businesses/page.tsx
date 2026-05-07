"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Business } from "@/types";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "businesses"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Business)));
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleVerified = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "businesses", id), { verified: !current });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, verified: !current } : b));
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "businesses", id), { featured: !current });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, featured: !current } : b));
  };

  const filtered = businesses.filter(b => {
    if (filter === "pending") return !b.verified;
    if (filter === "verified") return b.verified;
    return true;
  });

  const pending = businesses.filter(b => !b.verified).length;

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Bizneset</h1>
            <p>{businesses.length} gjithsej · {pending} në pritje aprovimi</p>
          </div>
        </div>
      </div>

      {pending > 0 && (
        <div className="adm-alert adm-alert-warn">
          ⚠️ Ke {pending} biznes{pending > 1 ? "e" : ""} që presin aprovim!
        </div>
      )}

      <div className="adm-filters">
        {(["all", "pending", "verified"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`adm-filter-btn ${filter === f ? "active" : ""}`}>
            {f === "all" ? "Të gjitha" : f === "pending" ? "Në pritje" : "Aprovuar"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="adm-loading">Duke ngarkuar...</div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">😕 Nuk ka biznese për këtë filtër.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Biznesi</th>
                <th>Qyteti</th>
                <th>Abonimenti</th>
                <th>Aprovuar</th>
                <th>Featured</th>
                <th>Veprime</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <div className="adm-biz-cell">
                      {b.logo
                        ? <img src={b.logo} alt={b.name} className="adm-biz-logo" />
                        : <div className="adm-biz-logo adm-biz-placeholder">🏪</div>
                      }
                      <div>
                        <p className="adm-biz-name">{b.name}</p>
                        <p className="adm-biz-phone">{b.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="adm-text-muted">{b.city}</span></td>
                  <td>
                    <span className={`adm-sub-badge adm-sub-${b.subscription}`}>
                      {b.subscription}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleVerified(b.id, b.verified)}
                      className={`adm-toggle-btn ${b.verified ? "on" : "off"}`}>
                      {b.verified ? "✓ Po" : "✗ Jo"}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => toggleFeatured(b.id, b.featured)}
                      className={`adm-toggle-btn ${b.featured ? "on" : "off"}`}>
                      {b.featured ? "⭐ Po" : "— Jo"}
                    </button>
                  </td>
                  <td>
                    <span className="adm-text-muted" style={{ fontSize: "0.78rem" }}>
                      {b.address?.slice(0, 30)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.25rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-alert{padding:0.75rem 1rem;border-radius:10px;font-size:0.875rem;margin-bottom:1.25rem}
        .adm-alert-warn{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fbbf24}
        .adm-filters{display:flex;gap:6px;margin-bottom:1.25rem}
        .adm-filter-btn{padding:0.45rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.825rem;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
        .adm-filter-btn:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .adm-filter-btn.active{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .adm-loading,.adm-empty{text-align:center;padding:3rem;color:#71717a;font-size:0.9rem}
        .adm-table-wrap{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden}
        .adm-table{width:100%;border-collapse:collapse}
        .adm-table th{padding:0.75rem 1rem;text-align:left;font-size:0.75rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .adm-table td{padding:0.85rem 1rem;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:middle}
        .adm-table tr:last-child td{border-bottom:none}
        .adm-table tr:hover td{background:rgba(255,255,255,0.02)}
        .adm-biz-cell{display:flex;align-items:center;gap:10px}
        .adm-biz-logo{width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0}
        .adm-biz-placeholder{background:rgba(249,115,22,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem}
        .adm-biz-name{font-size:0.875rem;font-weight:600;color:#e4e4e7}
        .adm-biz-phone{font-size:0.75rem;color:#71717a}
        .adm-text-muted{font-size:0.85rem;color:#71717a}
        .adm-sub-badge{font-size:0.72rem;font-weight:600;padding:3px 8px;border-radius:6px;text-transform:capitalize}
        .adm-sub-free{background:rgba(255,255,255,0.06);color:#71717a;border:1px solid rgba(255,255,255,0.1)}
        .adm-sub-basic{background:rgba(59,130,246,0.12);color:#60a5fa;border:1px solid rgba(59,130,246,0.25)}
        .adm-sub-pro{background:rgba(168,85,247,0.12);color:#c084fc;border:1px solid rgba(168,85,247,0.25)}
        .adm-sub-premium{background:rgba(249,115,22,0.12);color:#f97316;border:1px solid rgba(249,115,22,0.25)}
        .adm-toggle-btn{border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-toggle-btn.on{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-toggle-btn.off{background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
      `}</style>
    </div>
  );
}
