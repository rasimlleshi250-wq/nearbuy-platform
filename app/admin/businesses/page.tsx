"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Business } from "@/types";

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a", basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316"
};

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "plan_requests">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    setActionLoading(id + "_verified");
    await updateDoc(doc(db, "businesses", id), { verified: !current });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, verified: !current } : b));
    setActionLoading(null);
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    setActionLoading(id + "_featured");
    await updateDoc(doc(db, "businesses", id), { featured: !current });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, featured: !current } : b));
    setActionLoading(null);
  };

  const approvePlan = async (id: string, requestedPlan: string) => {
    setActionLoading(id + "_plan");
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);
    await updateDoc(doc(db, "businesses", id), {
      subscription: requestedPlan,
      planStatus: "active",
      requestedPlan: null,
      subscriptionStart: now.toISOString().split("T")[0],
      subscriptionEnd: endDate.toISOString().split("T")[0],
    });
    setBusinesses(prev => prev.map(b =>
      b.id === id ? { ...b, subscription: requestedPlan as any, planStatus: "active" as any, requestedPlan: undefined } as any : b
    ));
    setActionLoading(null);
  };

  const rejectPlan = async (id: string) => {
    setActionLoading(id + "_plan");
    await updateDoc(doc(db, "businesses", id), {
      planStatus: "rejected",
      requestedPlan: null,
    });
    setBusinesses(prev => prev.map(b =>
      b.id === id ? { ...b, planStatus: "rejected", requestedPlan: undefined } : b
    ));
    setActionLoading(null);
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

  const renewSubscription = async (id: string, currentEnd?: string) => {
    const base = currentEnd && new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date();
    const newEnd = new Date(base);
    newEnd.setMonth(newEnd.getMonth() + 1);
    const newEndStr = newEnd.toISOString().split("T")[0];
    await updateDoc(doc(db, "businesses", id), { subscriptionEnd: newEndStr });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, subscriptionEnd: newEndStr } as any : b));
  };

  const filtered = businesses.filter(b => {
    if (filter === "pending") return !b.verified;
    if (filter === "verified") return b.verified;
    if (filter === "plan_requests") return (b as any).planStatus === "pending";
    return true;
  });

  const pendingVerif = businesses.filter(b => !b.verified).length;
  const pendingPlans = businesses.filter(b => (b as any).planStatus === "pending").length;

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Bizneset</h1>
            <p>{businesses.length} gjithsej · {pendingVerif} aprovim · {pendingPlans} kërkesa plani</p>
          </div>
        </div>
      </div>

      {pendingVerif > 0 && (
        <div className="adm-alert adm-alert-warn">
          ⚠️ Ke {pendingVerif} biznes{pendingVerif > 1 ? "e" : ""} që presin aprovim!
        </div>
      )}

      {pendingPlans > 0 && (
        <div className="adm-alert adm-alert-blue">
          📋 Ke {pendingPlans} kërkesë{pendingPlans > 1 ? " plani" : " plani"} në pritje!
        </div>
      )}

      <div className="adm-filters">
        {([
          { key: "all", label: "Të gjitha" },
          { key: "pending", label: `Aprovim${pendingVerif > 0 ? ` (${pendingVerif})` : ""}` },
          { key: "verified", label: "Aprovuar" },
          { key: "plan_requests", label: `Kërkesa plani${pendingPlans > 0 ? ` (${pendingPlans})` : ""}` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`adm-filter-btn ${filter === f.key ? "active" : ""} ${f.key === "plan_requests" && pendingPlans > 0 ? "has-badge" : ""}`}>
            {f.label}
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
                <th>Plani aktual</th>
                <th>Kërkesë plani</th>
                <th>Abonimenti</th>
                <th>Aprovuar</th>
                <th>Featured</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const bAny = b as any;
                const hasPlanRequest = bAny.planStatus === "pending" && bAny.requestedPlan;
                const pc = PLAN_COLORS[b.subscription] || "#71717a";
                const rpc = PLAN_COLORS[bAny.requestedPlan] || "#71717a";
                return (
                  <tr key={b.id} className={hasPlanRequest ? "tr-highlight" : ""}>
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
                      <span className="adm-sub-badge" style={{ background: `${pc}18`, color: pc, borderColor: `${pc}40` }}>
                        {b.subscription || "free"}
                      </span>
                    </td>
                    <td>
                      {bAny.subscriptionStart ? (
                        <div className="adm-sub-dates">
                          <div className="adm-sub-date-row">
                            <span className="adm-date-label">Filloi:</span>
                            <span className="adm-date-val">{bAny.subscriptionStart}</span>
                          </div>
                          <div className="adm-sub-date-row">
                            <span className="adm-date-label">Mbaron:</span>
                            <span className={`adm-date-val ${isExpiringSoon(bAny.subscriptionEnd) ? "adm-date-warn" : isExpired(bAny.subscriptionEnd) ? "adm-date-expired" : ""}`}>
                              {bAny.subscriptionEnd}
                              {isExpired(bAny.subscriptionEnd) && <span className="adm-expired-badge">Skaduar</span>}
                              {!isExpired(bAny.subscriptionEnd) && isExpiringSoon(bAny.subscriptionEnd) && <span className="adm-warn-badge">Shpejt</span>}
                            </span>
                          </div>
                          {b.subscription !== "free" && (
                            <button onClick={() => renewSubscription(b.id, bAny.subscriptionEnd)} className="adm-btn-renew">
                              ↻ Rinovо
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="adm-text-muted" style={{ fontSize: "0.78rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      {hasPlanRequest ? (
                        <div className="adm-plan-request">
                          <span className="adm-sub-badge" style={{ background: `${rpc}18`, color: rpc, borderColor: `${rpc}40` }}>
                            {bAny.requestedPlan}
                          </span>
                          <div className="adm-plan-btns">
                            <button
                              onClick={() => approvePlan(b.id, bAny.requestedPlan)}
                              disabled={actionLoading === b.id + "_plan"}
                              className="adm-btn-approve"
                            >
                              {actionLoading === b.id + "_plan" ? "..." : "✓ Aprovo"}
                            </button>
                            <button
                              onClick={() => rejectPlan(b.id)}
                              disabled={actionLoading === b.id + "_plan"}
                              className="adm-btn-reject"
                            >
                              ✗ Refuzo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="adm-text-muted" style={{ fontSize: "0.78rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <button onClick={() => toggleVerified(b.id, b.verified)}
                        disabled={actionLoading === b.id + "_verified"}
                        className={`adm-toggle-btn ${b.verified ? "on" : "off"}`}>
                        {actionLoading === b.id + "_verified" ? "..." : b.verified ? "✓ Po" : "✗ Jo"}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => toggleFeatured(b.id, b.featured)}
                        disabled={actionLoading === b.id + "_featured"}
                        className={`adm-toggle-btn ${b.featured ? "on" : "off"}`}>
                        {actionLoading === b.id + "_featured" ? "..." : b.featured ? "⭐ Po" : "— Jo"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.25rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-alert{padding:0.75rem 1rem;border-radius:10px;font-size:0.875rem;margin-bottom:0.75rem}
        .adm-alert-warn{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fbbf24}
        .adm-alert-blue{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);color:#93c5fd}
        .adm-filters{display:flex;gap:6px;margin-bottom:1.25rem;flex-wrap:wrap}
        .adm-filter-btn{padding:0.45rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.825rem;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
        .adm-filter-btn:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .adm-filter-btn.active{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .adm-filter-btn.has-badge{border-color:rgba(59,130,246,0.3);color:#93c5fd}
        .adm-filter-btn.has-badge.active{background:rgba(59,130,246,0.12);border-color:rgba(59,130,246,0.4);color:#93c5fd}
        .adm-loading,.adm-empty{text-align:center;padding:3rem;color:#71717a;font-size:0.9rem}
        .adm-table-wrap{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;overflow-x:auto}
        .adm-table{width:100%;border-collapse:collapse;min-width:700px}
        .adm-table th{padding:0.75rem 1rem;text-align:left;font-size:0.75rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .adm-table td{padding:0.85rem 1rem;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:middle}
        .adm-table tr:last-child td{border-bottom:none}
        .adm-table tr:hover td{background:rgba(255,255,255,0.02)}
        .tr-highlight td{background:rgba(59,130,246,0.04)!important}
        .adm-biz-cell{display:flex;align-items:center;gap:10px}
        .adm-biz-logo{width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0}
        .adm-biz-placeholder{background:rgba(249,115,22,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem}
        .adm-biz-name{font-size:0.875rem;font-weight:600;color:#e4e4e7}
        .adm-biz-phone{font-size:0.75rem;color:#71717a}
        .adm-text-muted{font-size:0.85rem;color:#71717a}
        .adm-sub-badge{font-size:0.72rem;font-weight:600;padding:3px 8px;border-radius:6px;text-transform:capitalize;border:1px solid}
        .adm-plan-request{display:flex;flex-direction:column;gap:6px}
        .adm-plan-btns{display:flex;gap:5px}
        .adm-btn-approve{padding:4px 10px;border-radius:6px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.1);color:#22c55e;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-btn-approve:hover:not(:disabled){background:rgba(34,197,94,0.2)}
        .adm-btn-approve:disabled{opacity:0.5;cursor:not-allowed}
        .adm-btn-reject{padding:4px 10px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#f87171;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-btn-reject:hover:not(:disabled){background:rgba(239,68,68,0.15)}
        .adm-btn-reject:disabled{opacity:0.5;cursor:not-allowed}
        .adm-toggle-btn{border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-toggle-btn.on{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-toggle-btn.off{background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
        .adm-toggle-btn:disabled{opacity:0.5;cursor:not-allowed}
        .adm-sub-dates{display:flex;flex-direction:column;gap:4px}
        .adm-sub-date-row{display:flex;align-items:center;gap:5px}
        .adm-date-label{font-size:0.7rem;color:#52525b;min-width:42px}
        .adm-date-val{font-size:0.78rem;color:#a1a1aa;display:flex;align-items:center;gap:4px}
        .adm-date-warn{color:#f5c842!important}
        .adm-date-expired{color:#f87171!important}
        .adm-expired-badge{font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)}
        .adm-warn-badge{font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(245,200,66,0.15);color:#f5c842;border:1px solid rgba(245,200,66,0.3)}
        .adm-btn-renew{margin-top:3px;padding:3px 8px;border-radius:5px;border:1px solid rgba(59,130,246,0.3);background:rgba(59,130,246,0.08);color:#93c5fd;font-size:0.7rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-btn-renew:hover{background:rgba(59,130,246,0.15)}
      `}</style>
    </div>
  );
}
