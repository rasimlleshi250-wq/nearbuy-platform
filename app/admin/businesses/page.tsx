"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getCountFromServer, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Business } from "@/types";
import Link from "next/link";

const PLAN_COLORS: Record<string, string> = {
  free: "#71717a", basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316"
};
const PLANS = ["free", "basic", "advanced", "pro"];
const PAYMENT_METHODS = ["Cash", "Transfer Bankar", "Kartë", "Tjetër"];
const CITIES = ["Tiranë","Durrës","Vlorë","Shkodër","Elbasan","Korçë","Fier","Berat","Lushnjë","Kavajë","Gjirokastër","Sarandë","Lezhë","Kukës","Pogradec","Peshkopi"];

interface BizExtra extends Business {
  requestedPlan?: string;
  planStatus?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  blocked?: boolean;
  paymentMethod?: string;
  productCount?: number;
  registeredAt?: string;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BizExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all"|"pending"|"verified"|"plan_requests"|"blocked">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedBiz, setSelectedBiz] = useState<BizExtra | null>(null);
  const [editPlan, setEditPlan] = useState<BizExtra | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ plan: "", startDate: "", endDate: "", paymentMethod: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [msgModal, setMsgModal] = useState<BizExtra | null>(null);
  const [msgText, setMsgText] = useState("");
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "businesses"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const bizList = snap.docs.map(d => ({ id: d.id, ...d.data() } as BizExtra));
      // Ngarko numrin e produkteve per cdo biznes
      for (const biz of bizList) {
        try {
          const pq = query(collection(db, "business_products"), where("businessId", "==", biz.id));
          const psnap = await getDocs(pq);
          biz.productCount = psnap.size;
        } catch { biz.productCount = 0; }
      }
      setBusinesses(bizList);
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

  const toggleBlocked = async (id: string, current: boolean) => {
    setActionLoading(id + "_block");
    await updateDoc(doc(db, "businesses", id), { blocked: !current, verified: current ? false : undefined });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, blocked: !current } : b));
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
      b.id === id ? { ...b, subscription: requestedPlan as any, planStatus: "active", requestedPlan: undefined } : b
    ));
    setActionLoading(null);
  };

  const rejectPlan = async (id: string) => {
    setActionLoading(id + "_plan");
    await updateDoc(doc(db, "businesses", id), { planStatus: "rejected", requestedPlan: null });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, planStatus: "rejected", requestedPlan: undefined } : b));
    setActionLoading(null);
  };

  const renewSubscription = async (id: string, currentEnd?: string) => {
    const base = currentEnd && new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date();
    const newEnd = new Date(base);
    newEnd.setMonth(newEnd.getMonth() + 1);
    const newEndStr = newEnd.toISOString().split("T")[0];
    await updateDoc(doc(db, "businesses", id), { subscriptionEnd: newEndStr });
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, subscriptionEnd: newEndStr } : b));
  };

  const savePlanEdit = async () => {
    if (!editPlan) return;
    setActionLoading(editPlan.id + "_planedit");
    await updateDoc(doc(db, "businesses", editPlan.id), {
      subscription: editPlanForm.plan,
      subscriptionStart: editPlanForm.startDate,
      subscriptionEnd: editPlanForm.endDate,
      paymentMethod: editPlanForm.paymentMethod,
      planStatus: "active",
    });
    setBusinesses(prev => prev.map(b => b.id === editPlan.id ? {
      ...b,
      subscription: editPlanForm.plan as any,
      subscriptionStart: editPlanForm.startDate,
      subscriptionEnd: editPlanForm.endDate,
      paymentMethod: editPlanForm.paymentMethod,
    } : b));
    setEditPlan(null);
    setActionLoading(null);
  };

  const deleteBusiness = async (id: string) => {
    setActionLoading(id + "_delete");
    await deleteDoc(doc(db, "businesses", id));
    setBusinesses(prev => prev.filter(b => b.id !== id));
    setDeleteConfirm(null);
    setActionLoading(null);
  };

  const exportCSV = () => {
    const rows = [["Emri", "Qyteti", "Telefoni", "Plani", "Filloi", "Mbaron", "Aprovuar", "Produktet", "Pagesa"]];
    businesses.forEach(b => {
      rows.push([b.name, b.city, b.phone||"", b.subscription, b.subscriptionStart||"", b.subscriptionEnd||"", b.verified?"Po":"Jo", String(b.productCount||0), b.paymentMethod||""]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bizneset.csv"; a.click();
  };

  const isExpired = (d?: string) => d ? new Date(d) < new Date() : false;
  const isExpiringSoon = (d?: string) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 7;
  };

  const filtered = businesses.filter(b => {
    if (filter === "pending") return !b.verified && !b.blocked;
    if (filter === "verified") return b.verified;
    if (filter === "plan_requests") return b.planStatus === "pending";
    if (filter === "blocked") return b.blocked;
    return true;
  }).filter(b => !cityFilter || b.city === cityFilter)
    .filter(b => !planFilter || b.subscription === planFilter)
    .filter(b => !searchQ || b.name?.toLowerCase().includes(searchQ.toLowerCase()) || b.phone?.includes(searchQ));

  const pendingVerif = businesses.filter(b => !b.verified && !b.blocked).length;
  const pendingPlans = businesses.filter(b => b.planStatus === "pending").length;
  const blockedCount = businesses.filter(b => b.blocked).length;

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Bizneset</h1>
            <p>{businesses.length} gjithsej · {pendingVerif} aprovim · {pendingPlans} kërkesa plani{blockedCount > 0 ? ` · ${blockedCount} bllokuar` : ""}</p>
          </div>
          <button onClick={exportCSV} className="adm-btn-export">⬇ Eksporto CSV</button>
        </div>
      </div>

      {pendingVerif > 0 && <div className="adm-alert adm-alert-warn">⚠️ Ke {pendingVerif} biznes që pret aprovim!</div>}
      {pendingPlans > 0 && <div className="adm-alert adm-alert-blue">📋 Ke {pendingPlans} kërkesë plani në pritje!</div>}

      {/* Filters */}
      <div className="adm-filters-wrap">
        <div className="adm-filters">
          {([
            { key: "all", label: "Të gjitha" },
            { key: "pending", label: `Aprovim${pendingVerif > 0 ? ` (${pendingVerif})` : ""}` },
            { key: "verified", label: "Aprovuar" },
            { key: "plan_requests", label: `Kërkesa plani${pendingPlans > 0 ? ` (${pendingPlans})` : ""}` },
            { key: "blocked", label: `Bllokuar${blockedCount > 0 ? ` (${blockedCount})` : ""}` },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`adm-filter-btn ${filter === f.key ? "active" : ""}`}>{f.label}</button>
          ))}
        </div>
        <div className="adm-filters-right">
          <input className="adm-search" placeholder="🔍 Kërko emër, telefon..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          <select className="adm-sel" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
            <option value="">Të gjitha qytetet</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="adm-sel" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
            <option value="">Të gjitha planet</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
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
                <th>Plani</th>
                <th>Abonimenti</th>
                <th>Kërkesë Plani</th>
                <th>Produkte</th>
                <th>Aprovuar</th>
                <th>Featured</th>
                <th>Veprime</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const pc = PLAN_COLORS[b.subscription] || "#71717a";
                const rpc = PLAN_COLORS[b.requestedPlan||""] || "#71717a";
                const hasPlanRequest = b.planStatus === "pending" && b.requestedPlan;
                return (
                  <tr key={b.id} className={`${hasPlanRequest ? "tr-highlight" : ""} ${b.blocked ? "tr-blocked" : ""}`}>
                    <td>
                      <div className="adm-biz-cell">
                        {b.logo ? <img src={b.logo} alt={b.name} className="adm-biz-logo" />
                          : <div className="adm-biz-logo adm-biz-placeholder">🏪</div>}
                        <div>
                          <p className="adm-biz-name">{b.name} {b.blocked && <span className="adm-blocked-tag">Bllokuar</span>}</p>
                          <p className="adm-biz-phone">{b.phone}</p>
                          {b.paymentMethod && <p className="adm-biz-pay">💳 {b.paymentMethod}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="adm-text-muted">{b.city}</span></td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span className="adm-sub-badge" style={{ background: `${pc}18`, color: pc, borderColor: `${pc}40` }}>
                          {b.subscription || "free"}
                        </span>
                        <button onClick={() => { setEditPlan(b); setEditPlanForm({ plan: b.subscription||"free", startDate: b.subscriptionStart||"", endDate: b.subscriptionEnd||"", paymentMethod: b.paymentMethod||"" }); }} className="adm-btn-edit-plan" title="Ndrysho planin">✏️</button>
                      </div>
                    </td>
                    <td>
                      {b.subscriptionStart ? (
                        <div className="adm-sub-dates">
                          <div className="adm-sub-date-row"><span className="adm-date-label">Filloi:</span><span className="adm-date-val">{b.subscriptionStart}</span></div>
                          <div className="adm-sub-date-row">
                            <span className="adm-date-label">Mbaron:</span>
                            <span className={`adm-date-val ${isExpiringSoon(b.subscriptionEnd) ? "adm-date-warn" : isExpired(b.subscriptionEnd) ? "adm-date-expired" : ""}`}>
                              {b.subscriptionEnd}
                              {isExpired(b.subscriptionEnd) && <span className="adm-expired-badge">Skaduar</span>}
                              {!isExpired(b.subscriptionEnd) && isExpiringSoon(b.subscriptionEnd) && <span className="adm-warn-badge">Shpejt</span>}
                            </span>
                          </div>
                          {b.subscription !== "free" && (
                            <button onClick={() => renewSubscription(b.id, b.subscriptionEnd)} className="adm-btn-renew">↻ Rinovо</button>
                          )}
                        </div>
                      ) : <span className="adm-text-muted" style={{fontSize:"0.78rem"}}>—</span>}
                    </td>
                    <td>
                      {hasPlanRequest ? (
                        <div className="adm-plan-request">
                          <span className="adm-sub-badge" style={{ background: `${rpc}18`, color: rpc, borderColor: `${rpc}40` }}>{b.requestedPlan}</span>
                          <div className="adm-plan-btns">
                            <button onClick={() => approvePlan(b.id, b.requestedPlan!)} disabled={actionLoading === b.id + "_plan"} className="adm-btn-approve">
                              {actionLoading === b.id + "_plan" ? "..." : "✓ Aprovo"}
                            </button>
                            <button onClick={() => rejectPlan(b.id)} disabled={actionLoading === b.id + "_plan"} className="adm-btn-reject">✗ Refuzo</button>
                          </div>
                        </div>
                      ) : <span className="adm-text-muted" style={{fontSize:"0.78rem"}}>—</span>}
                    </td>
                    <td><span className="adm-prod-count">{b.productCount || 0}</span></td>
                    <td>
                      <button onClick={() => toggleVerified(b.id, b.verified)} disabled={actionLoading === b.id + "_verified"}
                        className={`adm-toggle-btn ${b.verified ? "on" : "off"}`}>
                        {actionLoading === b.id + "_verified" ? "..." : b.verified ? "✓ Po" : "✗ Jo"}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => toggleFeatured(b.id, b.featured)} disabled={actionLoading === b.id + "_featured"}
                        className={`adm-toggle-btn ${b.featured ? "on" : "off"}`}>
                        {actionLoading === b.id + "_featured" ? "..." : b.featured ? "⭐ Po" : "— Jo"}
                      </button>
                    </td>
                    <td>
                      <div className="adm-actions-cell">
                        <button onClick={() => setSelectedBiz(b)} className="adm-btn-action" title="Shiko detajet">👁</button>
                        <Link href={`/admin/businesses/${b.id}/stats`} className="adm-btn-action" title="Statistika">📊</Link>
                        <button onClick={() => toggleBlocked(b.id, !!b.blocked)} disabled={actionLoading === b.id + "_block"}
                          className={`adm-btn-action ${b.blocked ? "unblock" : "block"}`} title={b.blocked ? "Çbloko" : "Bloko"}>
                          {b.blocked ? "🔓" : "🔒"}
                        </button>
                        <button onClick={() => setDeleteConfirm(b.id)} className="adm-btn-action delete" title="Fshi">🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Detajet e biznesit */}
      {selectedBiz && (
        <div className="adm-modal-overlay" onClick={() => setSelectedBiz(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>Detajet e biznesit</h2>
              <button onClick={() => setSelectedBiz(null)} className="adm-modal-close">✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-detail-row"><span>Emri</span><strong>{selectedBiz.name}</strong></div>
              <div className="adm-detail-row"><span>Qyteti</span><strong>{selectedBiz.city}</strong></div>
              <div className="adm-detail-row"><span>Adresa</span><strong>{(selectedBiz as any).address || "—"}</strong></div>
              <div className="adm-detail-row"><span>Telefoni</span><strong>{selectedBiz.phone || "—"}</strong></div>
              <div className="adm-detail-row"><span>Kategoria</span><strong>{(selectedBiz as any).category || "—"}</strong></div>
              <div className="adm-detail-row"><span>Email</span><strong>{(selectedBiz as any).email || "—"}</strong></div>
              <div className="adm-detail-row"><span>Plani</span><strong>{selectedBiz.subscription}</strong></div>
              <div className="adm-detail-row"><span>Filloi</span><strong>{selectedBiz.subscriptionStart || "—"}</strong></div>
              <div className="adm-detail-row"><span>Mbaron</span><strong>{selectedBiz.subscriptionEnd || "—"}</strong></div>
              <div className="adm-detail-row"><span>Pagesa</span><strong>{selectedBiz.paymentMethod || "—"}</strong></div>
              <div className="adm-detail-row"><span>Produkte</span><strong>{selectedBiz.productCount || 0}</strong></div>
              <div className="adm-detail-row"><span>Aprovuar</span><strong>{selectedBiz.verified ? "Po" : "Jo"}</strong></div>
              <div className="adm-detail-row"><span>Featured</span><strong>{selectedBiz.featured ? "Po" : "Jo"}</strong></div>
              {(selectedBiz as any).description && (
                <div className="adm-detail-row adm-detail-desc"><span>Përshkrimi</span><strong>{(selectedBiz as any).description}</strong></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edito planin */}
      {editPlan && (
        <div className="adm-modal-overlay" onClick={() => setEditPlan(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>Ndrysho planin — {editPlan.name}</h2>
              <button onClick={() => setEditPlan(null)} className="adm-modal-close">✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-field">
                <label>Plani</label>
                <select value={editPlanForm.plan} onChange={e => setEditPlanForm(p => ({...p, plan: e.target.value}))}>
                  {PLANS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                </select>
              </div>
              <div className="adm-form-field">
                <label>Data fillimit</label>
                <input type="date" value={editPlanForm.startDate} onChange={e => setEditPlanForm(p => ({...p, startDate: e.target.value}))} />
              </div>
              <div className="adm-form-field">
                <label>Data mbarimit</label>
                <input type="date" value={editPlanForm.endDate} onChange={e => setEditPlanForm(p => ({...p, endDate: e.target.value}))} />
              </div>
              <div className="adm-form-field">
                <label>Metoda e pagesës</label>
                <select value={editPlanForm.paymentMethod} onChange={e => setEditPlanForm(p => ({...p, paymentMethod: e.target.value}))}>
                  <option value="">Zgjidh...</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button onClick={savePlanEdit} disabled={actionLoading === editPlan.id + "_planedit"} className="adm-btn-save">
                {actionLoading === editPlan.id + "_planedit" ? "Duke ruajtur..." : "Ruaj ndryshimet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmo fshirjen */}
      {deleteConfirm && (
        <div className="adm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>Konfirmo fshirjen</h2>
              <button onClick={() => setDeleteConfirm(null)} className="adm-modal-close">✕</button>
            </div>
            <div className="adm-modal-body">
              <p style={{color:"#a1a1aa",marginBottom:"1.25rem"}}>Jeni të sigurt? Ky veprim nuk mund të kthehet.</p>
              <div style={{display:"flex",gap:10}}>
                <button onClick={() => deleteBusiness(deleteConfirm)} disabled={actionLoading === deleteConfirm + "_delete"}
                  className="adm-btn-delete-confirm">
                  {actionLoading === deleteConfirm + "_delete" ? "Duke fshirë..." : "Po, fshi"}
                </button>
                <button onClick={() => setDeleteConfirm(null)} className="adm-btn-cancel">Anulo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.25rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-btn-export{padding:0.5rem 1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#a1a1aa;font-size:0.8rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;white-space:nowrap}
        .adm-btn-export:hover{background:rgba(255,255,255,0.08);color:#fff}
        .adm-alert{padding:0.75rem 1rem;border-radius:10px;font-size:0.875rem;margin-bottom:0.75rem}
        .adm-alert-warn{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fbbf24}
        .adm-alert-blue{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);color:#93c5fd}
        .adm-filters-wrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:1.25rem}
        .adm-filters{display:flex;gap:6px;flex-wrap:wrap}
        .adm-filters-right{display:flex;gap:8px;flex-wrap:wrap}
        .adm-filter-btn{padding:0.45rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.825rem;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
        .adm-filter-btn:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .adm-filter-btn.active{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .adm-search{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#f4f4f5;font-size:0.8rem;padding:0.45rem 0.75rem;outline:none;font-family:inherit;width:200px}
        .adm-search:focus{border-color:rgba(249,115,22,0.4)}
        .adm-sel{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#a1a1aa;font-size:0.8rem;padding:0.45rem 0.75rem;outline:none;font-family:inherit;cursor:pointer}
        .adm-sel option{background:#1c1c1c}
        .adm-loading,.adm-empty{text-align:center;padding:3rem;color:#71717a;font-size:0.9rem}
        .adm-table-wrap{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;overflow-x:auto}
        .adm-table{width:100%;border-collapse:collapse;min-width:900px}
        .adm-table th{padding:0.75rem 1rem;text-align:left;font-size:0.75rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .adm-table td{padding:0.85rem 1rem;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:middle}
        .adm-table tr:last-child td{border-bottom:none}
        .adm-table tr:hover td{background:rgba(255,255,255,0.02)}
        .tr-highlight td{background:rgba(59,130,246,0.04)!important}
        .tr-blocked td{background:rgba(239,68,68,0.03)!important;opacity:0.7}
        .adm-biz-cell{display:flex;align-items:center;gap:10px}
        .adm-biz-logo{width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0}
        .adm-biz-placeholder{background:rgba(249,115,22,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem}
        .adm-biz-name{font-size:0.875rem;font-weight:600;color:#e4e4e7;display:flex;align-items:center;gap:6px}
        .adm-biz-phone{font-size:0.75rem;color:#71717a}
        .adm-biz-pay{font-size:0.7rem;color:#52525b;margin-top:1px}
        .adm-blocked-tag{font-size:0.62rem;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)}
        .adm-text-muted{font-size:0.85rem;color:#71717a}
        .adm-sub-badge{font-size:0.72rem;font-weight:600;padding:3px 8px;border-radius:6px;text-transform:capitalize;border:1px solid}
        .adm-btn-edit-plan{background:none;border:none;cursor:pointer;font-size:0.8rem;opacity:0.5;padding:2px;transition:opacity .2s}
        .adm-btn-edit-plan:hover{opacity:1}
        .adm-plan-request{display:flex;flex-direction:column;gap:6px}
        .adm-plan-btns{display:flex;gap:5px}
        .adm-btn-approve{padding:4px 10px;border-radius:6px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.1);color:#22c55e;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-btn-approve:hover:not(:disabled){background:rgba(34,197,94,0.2)}
        .adm-btn-approve:disabled,.adm-btn-reject:disabled{opacity:0.5;cursor:not-allowed}
        .adm-btn-reject{padding:4px 10px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#f87171;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-btn-reject:hover:not(:disabled){background:rgba(239,68,68,0.15)}
        .adm-toggle-btn{border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-toggle-btn.on{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-toggle-btn.off{background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
        .adm-toggle-btn:disabled{opacity:0.5;cursor:not-allowed}
        .adm-prod-count{font-size:0.85rem;font-weight:600;color:#e4e4e7}
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
        .adm-actions-cell{display:flex;gap:4px;align-items:center}
        .adm-btn-action{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:4px 7px;font-size:0.8rem;cursor:pointer;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center}
        .adm-btn-action:hover{background:rgba(255,255,255,0.1)}
        .adm-btn-action.delete{border-color:rgba(239,68,68,0.2)}
        .adm-btn-action.delete:hover{background:rgba(239,68,68,0.1)}
        .adm-btn-action.block:hover{background:rgba(239,68,68,0.1)}
        .adm-btn-action.unblock:hover{background:rgba(34,197,94,0.1)}
        .adm-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;display:flex;align-items:center;justify-content:center;padding:1rem}
        .adm-modal{background:#161616;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto}
        .adm-modal-sm{max-width:360px}
        .adm-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.07)}
        .adm-modal-header h2{font-size:1rem;font-weight:700;color:#fff}
        .adm-modal-close{background:none;border:none;color:#71717a;font-size:1rem;cursor:pointer;padding:4px;border-radius:6px}
        .adm-modal-close:hover{color:#fff;background:rgba(255,255,255,0.06)}
        .adm-modal-body{padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.75rem}
        .adm-detail-row{display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem}
        .adm-detail-row span{color:#71717a}
        .adm-detail-row strong{color:#e4e4e7;text-align:right;max-width:60%}
        .adm-detail-desc{align-items:flex-start}
        .adm-detail-desc strong{text-align:right;line-height:1.5}
        .adm-form-field{display:flex;flex-direction:column;gap:0.4rem}
        .adm-form-field label{font-size:0.78rem;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.02em}
        .adm-form-field input,.adm-form-field select{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;padding:0.65rem 0.85rem;outline:none;font-family:inherit;transition:border-color .2s}
        .adm-form-field input:focus,.adm-form-field select:focus{border-color:rgba(249,115,22,0.5)}
        .adm-form-field select option{background:#1c1c1c}
        .adm-btn-save{width:100%;padding:0.7rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s;margin-top:0.5rem}
        .adm-btn-save:hover:not(:disabled){background:#ea6c0a}
        .adm-btn-save:disabled{opacity:0.5;cursor:not-allowed}
        .adm-btn-delete-confirm{flex:1;padding:0.65rem;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-btn-delete-confirm:hover:not(:disabled){background:rgba(239,68,68,0.25)}
        .adm-btn-delete-confirm:disabled{opacity:0.5;cursor:not-allowed}
        .adm-btn-cancel{flex:1;padding:0.65rem;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;border-radius:10px;font-size:0.875rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .adm-btn-cancel:hover{border-color:rgba(255,255,255,0.2);color:#fff}
      `}</style>
    </div>
  );
}
