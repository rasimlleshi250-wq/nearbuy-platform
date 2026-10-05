"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getTotalStats } from "@/lib/firebase/analytics";
import Link from "next/link";
import { PRO_PLANS, PRO_PLAN_ORDER, ProPlanId, getEffectiveProPlan, normalizeProPlanId, normalizeProfession } from "@/lib/proPlans";
import { getSubscriptionState, formatDate } from "@/lib/subscription";
import { formatEur } from "@/lib/plans";
import { notify } from "@/lib/notify";

interface Stats { totalViews: number; totalContacts: number }
type Pro = Record<string, any> & { id: string };

export default function ProfessionalDashboardPage() {
  const { user } = useAuth();
  const [pro, setPro] = useState<Pro | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "professionals", user.uid));
        if (snap.exists()) {
          setPro({ id: snap.id, ...snap.data() });
          setStats(await getTotalStats("professionals", user.uid));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  // Profesionisti vetëm KËRKON paketën; e aktivizon admini pas pagesës
  const requestPlan = async (id: ProPlanId) => {
    if (!user) return;
    setRequesting(true);
    try {
      await updateDoc(doc(db, "professionals", user.uid), { requestedPlan: id, planStatus: "pending", planRequestedAt: serverTimestamp() });
      setPro(p => (p ? { ...p, requestedPlan: id, planStatus: "pending" } : p));
      setRequested(id);
      notify("plan_request", user.uid, "professional");
    } catch (e) { console.error(e); alert("Kërkesa nuk u dërgua. Provo përsëri."); }
    finally { setRequesting(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(168,85,247,0.2);border-top-color:#c084fc;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!pro) return <p style={{ color: "#71717a" }}>Profili nuk u gjet.</p>;

  const plan = getEffectiveProPlan(pro);
  const st = getSubscriptionState({ ...pro, subscription: normalizeProPlanId(pro.subscription) });
  const storedPlan = PRO_PLANS[normalizeProPlanId(pro.subscription)];
  const pending = pro.planStatus === "pending" && pro.requestedPlan ? normalizeProPlanId(pro.requestedPlan) : null;
  const profession = normalizeProfession(pro.profession);

  return (
    <div className="pro-page">
      <div className="pro-page-header">
        <div>
          <h1>Overview</h1>
          <p>Mirë se erdhe, {pro.name?.split(" ")[0] || "Profesionist"}! 👋</p>
        </div>
        <div className="pro-header-btns">
          {pro.verified && <Link href={`/professionals/${pro.id}`} target="_blank" className="pro-btn-view">🔗 Shiko profilin</Link>}
          <Link href="/dashboard/professional/profile" className="pro-btn-edit">✏️ Edito profilin</Link>
        </div>
      </div>

      {!pro.verified && (
        <div className="pro-alert">
          <span>⏳</span>
          <div>
            <p className="pro-alert-title">Profili juaj është në pritje aprovimi</p>
            <p className="pro-alert-sub">Ekipi i NearBuy.al do të rishikojë profilin tuaj brenda 24 orëve.</p>
          </div>
        </div>
      )}

      {st.expired && (
        <div className="pro-alert pro-alert-red">
          <span>⚠</span>
          <div style={{ flex: 1 }}>
            <p className="pro-alert-title" style={{ color: "#f87171" }}>Paketa {storedPlan.name} skadoi{st.endDate ? ` më ${formatDate(st.endDate)}` : ""}</p>
            <p className="pro-alert-sub" style={{ color: "#a1a1aa" }}>Nuk merr më kërkesa për punë dhe profili nuk renditet më lart.</p>
          </div>
          {!pending && <button className="pro-renew" disabled={requesting} onClick={() => requestPlan(storedPlan.id)}>Rinovo {storedPlan.name}</button>}
        </div>
      )}
      {!st.expired && st.active && st.daysLeft !== null && st.daysLeft <= 7 && (
        <div className="pro-alert"><span>⏰</span><div><p className="pro-alert-title">Paketa skadon për {st.daysLeft} ditë</p><p className="pro-alert-sub" style={{ color: "#a1a1aa" }}>Rinovo që të mos ndalen kërkesat për punë.</p></div></div>
      )}
      {pending && (
        <div className="pro-alert pro-alert-blue"><span>⏳</span><div><p className="pro-alert-title" style={{ color: "#93c5fd" }}>Ke kërkuar paketën {PRO_PLANS[pending].name}</p><p className="pro-alert-sub" style={{ color: "#a1a1aa" }}>Do të të kontaktojmë për pagesën. Aktivizohet sapo të konfirmohet.</p></div></div>
      )}

      <div className="pro-profile-card">
        <div className="pro-profile-left">
          <div className="pro-avatar">
            {pro.photo ? <img src={pro.photo} alt={pro.name} />
              : <span className="pro-avatar-initials">{String(pro.name || "P").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className="pro-profile-details">
            <h2>{pro.name}</h2>
            <p className="pro-profession">{profession}</p>
            <div className="pro-meta">
              <span>📍 {(Array.isArray(pro.zones) && pro.zones.length ? pro.zones : [pro.city]).join(", ")}</span>
              {pro.pricePerHour && <span>💰 {Number(pro.pricePerHour).toLocaleString()} L/orë</span>}
              <span style={{ color: plan.color }}>● Paketa {plan.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pro-card">
        <h3 className="pro-card-title">Statistikat</h3>
        <div className="pro-stats-grid">
          <div className="pro-stat-card"><div className="pro-stat-icon">👁</div><div className="pro-stat-val">{(stats?.totalViews || 0).toLocaleString()}</div><div className="pro-stat-label">Shikime të profilit</div></div>
          <div className="pro-stat-card"><div className="pro-stat-icon">📞</div><div className="pro-stat-val">{(stats?.totalContacts || 0).toLocaleString()}</div><div className="pro-stat-label">Klientë që të kontaktuan</div></div>
        </div>
      </div>

      <div className="pro-card">
        <h3 className="pro-card-title">Paketat</h3>
        <div className="pro-plans">
          {PRO_PLAN_ORDER.map(id => {
            const p = PRO_PLANS[id];
            const current = plan.id === id;
            const isPending = pending === id;
            return (
              <div key={id} className={`pro-plan ${current ? "current" : ""}`} style={{ borderColor: current ? `${p.color}80` : undefined }}>
                {current && <span className="pro-plan-tag" style={{ background: p.color }}>Paketa jote</span>}
                {!current && id === "standard" && <span className="pro-plan-tag" style={{ background: p.color }}>Më e zgjedhura</span>}
                <p className="pro-plan-name" style={{ color: p.color }}>{p.name}</p>
                <p className="pro-plan-price">{formatEur(p.priceEur)}{p.priceEur > 0 && <span>/muaj</span>}</p>
                <ul>{p.perks.map(x => <li key={x}><span style={{ color: p.color }}>✓</span> {x}</li>)}</ul>
                {id !== "free" && (
                  <button disabled={requesting || current || isPending || !!pending} onClick={() => requestPlan(id)}
                    className="pro-plan-btn" style={current || isPending ? {} : { background: p.color }}>
                    {current ? "Paketa aktuale" : isPending ? "⏳ Në pritje" : requested === id ? "✓ U dërgua" : "Zgjidh këtë paketë"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="pro-note">Pas kërkesës do të të kontaktojmë për pagesën. Paketa aktivizohet sapo të konfirmohet pagesa.</p>
      </div>

      <style>{`
        .pro-page{display:flex;flex-direction:column;gap:1.25rem}
        .pro-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .pro-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:0.25rem}
        .pro-page-header p{font-size:0.85rem;color:#71717a}
        .pro-header-btns{display:flex;gap:8px;flex-wrap:wrap}
        .pro-btn-view{padding:0.6rem 1.2rem;background:rgba(255,255,255,0.05);color:#a1a1aa;border:1px solid rgba(255,255,255,0.1);border-radius:10px;font-size:0.875rem;font-weight:600;text-decoration:none;white-space:nowrap}
        .pro-btn-edit{padding:0.6rem 1.2rem;background:rgba(168,85,247,0.12);color:#c084fc;border:1px solid rgba(168,85,247,0.25);border-radius:10px;font-size:0.875rem;font-weight:600;text-decoration:none;white-space:nowrap}
        .pro-alert{display:flex;gap:12px;align-items:center;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:1rem;flex-wrap:wrap}
        .pro-alert-red{background:rgba(239,68,68,0.06);border-color:rgba(239,68,68,0.25)}
        .pro-alert-blue{background:rgba(59,130,246,0.06);border-color:rgba(59,130,246,0.25)}
        .pro-alert-title{font-size:0.875rem;font-weight:600;color:#fbbf24;margin-bottom:3px}
        .pro-alert-sub{font-size:0.8rem;color:#a16207}
        .pro-renew{padding:0.55rem 1.1rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit}
        .pro-profile-card{background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem}
        .pro-profile-left{display:flex;align-items:center;gap:16px}
        .pro-avatar{width:64px;height:64px;border-radius:50%;background:rgba(168,85,247,0.15);border:2px solid rgba(168,85,247,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
        .pro-avatar img{width:100%;height:100%;object-fit:cover}
        .pro-avatar-initials{font-size:1.2rem;font-weight:700;color:#c084fc}
        .pro-profile-details h2{font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:4px}
        .pro-profession{font-size:0.85rem;color:#f97316;font-weight:600;margin-bottom:8px}
        .pro-meta{display:flex;flex-wrap:wrap;gap:10px}
        .pro-meta span{font-size:0.78rem;color:#71717a}
        .pro-card{background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.5rem}
        .pro-card-title{font-size:0.9rem;font-weight:700;color:#e4e4e7;margin-bottom:1rem}
        .pro-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .pro-stat-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:1.5rem;background:rgba(168,85,247,0.05);border:1px solid rgba(168,85,247,0.15);border-radius:12px;text-align:center}
        .pro-stat-icon{font-size:1.5rem}
        .pro-stat-val{font-size:2rem;font-weight:800;color:#f4f4f5;line-height:1}
        .pro-stat-label{font-size:0.78rem;color:#71717a}
        .pro-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .pro-plan{position:relative;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,0.02)}
        .pro-plan-tag{position:absolute;top:-10px;left:50%;transform:translateX(-50%);color:#fff;font-size:0.68rem;font-weight:700;padding:2px 10px;border-radius:999px;white-space:nowrap}
        .pro-plan-name{font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em}
        .pro-plan-price{font-size:1.8rem;font-weight:800;color:#fff}
        .pro-plan-price span{font-size:0.85rem;color:#71717a;font-weight:500}
        .pro-plan ul{list-style:none;display:flex;flex-direction:column;gap:6px;flex:1}
        .pro-plan li{font-size:0.8rem;color:#a1a1aa}
        .pro-plan-btn{padding:0.6rem;border:none;border-radius:10px;color:#fff;font-weight:600;cursor:pointer;font-family:inherit;background:rgba(255,255,255,0.08)}
        .pro-plan-btn:disabled{cursor:default;opacity:0.85}
        .pro-note{font-size:0.78rem;color:#71717a;margin-top:0.75rem}
        @media(max-width:768px){.pro-plans,.pro-stats-grid{grid-template-columns:1fr}.pro-profile-card{flex-direction:column;align-items:flex-start}}
      `}</style>
    </div>
  );
}
