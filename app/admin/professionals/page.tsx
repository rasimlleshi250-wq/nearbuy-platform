"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Professional } from "@/types";

export default function AdminProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "professionals"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProfessionals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Professional)));
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleVerified = async (id: string, current: boolean) => {
    const newVerified = !current;
    await updateDoc(doc(db, "professionals", id), {
      verified: newVerified,
      status: newVerified ? "approved" : "pending",
    });
    setProfessionals(prev => prev.map(p =>
      p.id === id ? { ...p, verified: newVerified, status: newVerified ? "approved" : "pending" } : p
    ));
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "professionals", id), { featured: !current });
    setProfessionals(prev => prev.map(p => p.id === id ? { ...p, featured: !current } : p));
  };

  const filtered = professionals.filter(p => {
    if (filter === "pending") return !p.verified;
    if (filter === "verified") return p.verified;
    return true;
  });

  const pending = professionals.filter(p => !p.verified).length;

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Profesionistët</h1>
            <p>{professionals.length} gjithsej · {pending} në pritje aprovimi</p>
          </div>
        </div>
      </div>

      {pending > 0 && (
        <div className="adm-alert adm-alert-warn">
          ⚠️ Ke {pending} profesionist{pending > 1 ? "ë" : ""} që presin aprovim!
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
        <div className="adm-empty">😕 Nuk ka profesionistë për këtë filtër.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Profesionisti</th>
                <th>Profesioni</th>
                <th>Qyteti</th>
                <th>Telefoni</th>
                <th>Aprovuar</th>
                <th>Featured</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="adm-prof-cell">
                      {p.photo
                        ? <img src={p.photo} alt={p.name} className="adm-prof-photo" />
                        : <div className="adm-prof-photo adm-prof-placeholder">👤</div>
                      }
                      <div>
                        <p className="adm-prof-name">{p.name || p.displayName}</p>
                        <p className="adm-text-muted" style={{ fontSize: "0.72rem" }}>{p.services?.slice(0, 2).join(", ")}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="adm-badge">{p.profession || "—"}</span></td>
                  <td><span className="adm-text-muted">{p.city || "—"}</span></td>
                  <td><span className="adm-text-muted">{p.phone || "—"}</span></td>
                  <td>
                    <button onClick={() => toggleVerified(p.id, p.verified)}
                      className={`adm-toggle-btn ${p.verified ? "on" : "off"}`}>
                      {p.verified ? "✓ Aprovuar" : "✗ Në pritje"}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => toggleFeatured(p.id, p.featured)}
                      className={`adm-toggle-btn ${p.featured ? "on" : "off"}`}>
                      {p.featured ? "⭐ Po" : "— Jo"}
                    </button>
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
        .adm-prof-cell{display:flex;align-items:center;gap:10px}
        .adm-prof-photo{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0}
        .adm-prof-placeholder{background:rgba(168,85,247,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem}
        .adm-prof-name{font-size:0.875rem;font-weight:600;color:#e4e4e7}
        .adm-badge{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:2px 8px;font-size:0.75rem;color:#a1a1aa}
        .adm-text-muted{font-size:0.85rem;color:#71717a}
        .adm-toggle-btn{border:none;border-radius:6px;padding:4px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-toggle-btn.on{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-toggle-btn.off{background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
      `}</style>
    </div>
  );
}
