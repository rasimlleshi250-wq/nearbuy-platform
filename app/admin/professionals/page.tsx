"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Professional } from "@/types";
import { PRO_PLANS, PRO_PLAN_ORDER, normalizeProPlanId, getEffectiveProPlan, normalizeProfession } from "@/lib/proPlans";
import { getSubscriptionState, toDate, formatDate } from "@/lib/subscription";
import { recordPayment } from "@/lib/payments";

type Pro = Professional & Record<string, any>;
const DURATIONS = [1, 3, 6, 12];
const PAYMENT_METHODS = ["Cash", "Transfertë", "Kartë"];

// Pranon datën në çdo formë (tekst ose Timestamp i Firebase)
function addMonths(from: unknown, months: number): string {
  const fromDate = toDate(from);
  const base = fromDate && fromDate > new Date() ? fromDate : new Date();
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}
const raw = (p: Pro) => p as unknown as Record<string, unknown>;

export default function AdminProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Pro[]>([]);
  const [months, setMonths] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "requests">("all");

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "professionals"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProfessionals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pro)));
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

  // Aprovon paketën e kërkuar, ose rinovon atë aktuale, për N muaj
  const activatePlan = async (p: Pro, planIdRaw: string) => {
    const plan = normalizeProPlanId(planIdRaw);
    if (plan === "free") return;
    const m = months[p.id] || 1;
    const method = payMethod[p.id] || "Cash";
    const st = getSubscriptionState({ ...raw(p), subscription: normalizeProPlanId(p.subscription) });
    const samePlanActive = normalizeProPlanId(p.subscription) === plan && st.active;
    const today = new Date().toISOString().split("T")[0];
    const end = addMonths(samePlanActive ? p.subscriptionEnd : undefined, m);
    setBusy(p.id);
    try {
      const update = {
        subscription: plan, planStatus: "active", requestedPlan: null,
        subscriptionStart: samePlanActive && p.subscriptionStart ? p.subscriptionStart : today,
        subscriptionEnd: end, paymentMethod: method,
        lastPayment: { plan, months: m, amountEur: PRO_PLANS[plan].priceEur * m, method, date: today },
      };
      await updateDoc(doc(db, "professionals", p.id), update);
      await recordPayment({ type: "professional", entityId: p.id, name: String(p.name || ""), plan, planName: PRO_PLANS[plan].name,
        months: m, amountEur: PRO_PLANS[plan].priceEur * m, method, date: today, kind: samePlanActive ? "rinovim" : "aprovim" });
      setProfessionals(prev => prev.map(x => x.id === p.id ? ({ ...x, ...update, requestedPlan: undefined } as unknown as Pro) : x));
    } catch (e) { console.error(e); alert("Gabim gjatë aktivizimit."); }
    finally { setBusy(null); }
  };

  const rejectPlan = async (p: Pro) => {
    await updateDoc(doc(db, "professionals", p.id), { requestedPlan: null, planStatus: getSubscriptionState({ ...raw(p), subscription: normalizeProPlanId(p.subscription) }).active ? "active" : "rejected" });
    setProfessionals(prev => prev.map(x => x.id === p.id ? ({ ...x, requestedPlan: undefined, planStatus: "rejected" } as unknown as Pro) : x));
  };

  const filtered = professionals.filter(p => {
    if (search && !`${p.name} ${p.phone} ${p.city}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "pending") return !p.verified;
    if (filter === "verified") return p.verified;
    if (filter === "requests") return p.planStatus === "pending" && p.requestedPlan;
    return true;
  });

  const pending = professionals.filter(p => !p.verified).length;
  const planRequests = professionals.filter(p => p.planStatus === "pending" && p.requestedPlan).length;
  const paid = professionals.map(p => getEffectiveProPlan(raw(p))).filter(pl => pl.priceEur > 0);
  const mrr = paid.reduce((n, pl) => n + pl.priceEur, 0);

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Profesionistët</h1>
            <p>{professionals.length} gjithsej · {pending} në pritje aprovimi · {planRequests} kërkesa paketash</p>
            <p className="adm-mrr">💶 {paid.length} paketa aktive · <b>€{mrr}/muaj</b></p>
          </div>
        </div>
      </div>

      {pending > 0 && (
        <div className="adm-alert adm-alert-warn">
          ⚠️ Ke {pending} profesionist{pending > 1 ? "ë" : ""} që presin aprovim!
        </div>
      )}

      <div className="adm-filters">
        {(["all", "pending", "verified", "requests"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`adm-filter-btn ${filter === f ? "active" : ""}`}>
            {f === "all" ? "Të gjitha" : f === "pending" ? "Në pritje" : f === "verified" ? "Aprovuar" : `Kërkesa paketash${planRequests ? ` (${planRequests})` : ""}`}
          </button>
        ))}
        <input className="adm-search" placeholder="🔍 Kërko emër, telefon, qytet..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <th>Paketa</th>
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
                  <td><span className="adm-badge">{normalizeProfession(p.profession) || "—"}</span></td>
                  <td><span className="adm-text-muted">{(Array.isArray(p.zones) && p.zones.length ? p.zones : [p.city]).filter(Boolean).join(", ") || "—"}</span></td>
                  <td><span className="adm-text-muted">{p.phone || "—"}</span></td>
                  <td>{(() => {
                    const st = getSubscriptionState({ ...raw(p), subscription: normalizeProPlanId(p.subscription) });
                    const def = PRO_PLANS[normalizeProPlanId(p.subscription)];
                    const color = st.expired ? "#71717a" : def.color;
                    const sel = (
                      <div className="adm-renew-row">
                        <select className="adm-mini-sel" value={months[p.id] || 1} onChange={e => setMonths(m => ({ ...m, [p.id]: Number(e.target.value) }))}>
                          {DURATIONS.map(d => <option key={d} value={d}>{d} muaj</option>)}
                        </select>
                        <select className="adm-mini-sel" value={payMethod[p.id] || "Cash"} onChange={e => setPayMethod(m => ({ ...m, [p.id]: e.target.value }))}>
                          {PAYMENT_METHODS.map(x => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </div>
                    );
                    return (
                      <div className="adm-plan-cell">
                        <span className="adm-plan-badge" style={{ color, borderColor: `${color}55`, background: `${color}15` }}>
                          {def.name}{st.expired ? " · skaduar" : ""}
                        </span>
                        {st.endDate && def.id !== "free" && <span className="adm-text-muted" style={{ fontSize: "0.7rem" }}>deri {formatDate(st.endDate)}</span>}
                        {p.planStatus === "pending" && p.requestedPlan ? (
                          <>
                            <span className="adm-req">Kërkon: {PRO_PLANS[normalizeProPlanId(p.requestedPlan)].name} · €{PRO_PLANS[normalizeProPlanId(p.requestedPlan)].priceEur * (months[p.id] || 1)}</span>
                            {sel}
                            <div className="adm-renew-row">
                              <button className="adm-ok" disabled={busy === p.id} onClick={() => activatePlan(p, p.requestedPlan)}>✓ Aprovo</button>
                              <button className="adm-no" onClick={() => rejectPlan(p)}>✕</button>
                            </div>
                          </>
                        ) : def.id !== "free" ? (
                          <>{sel}<button className="adm-renew" disabled={busy === p.id} onClick={() => activatePlan(p, def.id)}>↻ Rinovo</button></>
                        ) : (
                          <select className="adm-mini-sel" value="" onChange={e => e.target.value && activatePlan(p, e.target.value)}>
                            <option value="">Aktivizo paketë...</option>
                            {PRO_PLAN_ORDER.filter(x => x !== "free").map(x => <option key={x} value={x}>{PRO_PLANS[x].name} (€{PRO_PLANS[x].priceEur})</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })()}</td>
                  <td>
                    <button onClick={() => toggleVerified(p.id, p.verified)}
                      className={`adm-toggle-btn ${p.verified ? "on" : "off"}`}>
                      {p.verified ? "✓ Aprovuar" : "✗ Në pritje"}
                    </button>
                  </td>
                  <td>
                    {/* Featured vjen automatikisht nga paketa Premium aktive */}
                    <span className={`adm-toggle-btn ${getEffectiveProPlan(raw(p)).featured ? "on" : "off"}`} title="Automatik nga Premium">
                      {getEffectiveProPlan(raw(p)).featured ? "⭐ Po" : "— Jo"}
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
        .adm-prof-cell{display:flex;align-items:center;gap:10px}
        .adm-prof-photo{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0}
        .adm-prof-placeholder{background:rgba(168,85,247,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem}
        .adm-prof-name{font-size:0.875rem;font-weight:600;color:#e4e4e7}
        .adm-badge{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:2px 8px;font-size:0.75rem;color:#a1a1aa}
        .adm-text-muted{font-size:0.85rem;color:#71717a}
        .adm-toggle-btn{border:none;border-radius:6px;padding:4px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-toggle-btn.on{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-mrr{font-size:0.82rem;color:#a1a1aa;margin-top:4px}
        .adm-mrr b{color:#22c55e}
        .adm-search{margin-left:auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#f4f4f5;font-size:0.82rem;padding:0.45rem 0.8rem;font-family:inherit;min-width:220px;outline:none}
        .adm-filters{flex-wrap:wrap;align-items:center}
        .adm-plan-cell{display:flex;flex-direction:column;gap:4px;align-items:flex-start}
        .adm-plan-badge{font-size:0.72rem;font-weight:600;padding:2px 8px;border-radius:6px;border:1px solid}
        .adm-req{font-size:0.72rem;color:#93c5fd;font-weight:600}
        .adm-renew-row{display:flex;gap:4px;flex-wrap:wrap}
        .adm-mini-sel{background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#e4e4e7;font-size:0.72rem;padding:3px 4px;font-family:inherit}
        .adm-ok{padding:3px 10px;border-radius:6px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.12);color:#22c55e;font-size:0.72rem;font-weight:600;cursor:pointer;font-family:inherit}
        .adm-no{padding:3px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.08);color:#f87171;font-size:0.72rem;cursor:pointer;font-family:inherit}
        .adm-renew{padding:3px 8px;border-radius:5px;border:1px solid rgba(59,130,246,0.3);background:rgba(59,130,246,0.1);color:#60a5fa;font-size:0.72rem;cursor:pointer;font-family:inherit}
        .adm-toggle-btn.off{background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
      `}</style>
    </div>
  );
}
