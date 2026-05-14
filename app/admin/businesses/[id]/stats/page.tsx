"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getLast30DaysStats, getTopProducts } from "@/lib/firebase/analytics";
import Link from "next/link";

interface Business {
  id: string;
  name: string;
  city: string;
  category: string;
  phone?: string;
  verified: boolean;
  subscription: string;
  featured: boolean;
  createdAt?: any;
}

interface DayData { date: string; count: number; }

export default function AdminBizStatsPage() {
  const params = useParams();
  const bizId = params.id as string;
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "businesses", bizId));
        if (!snap.exists()) return;
        const biz = { id: snap.id, ...snap.data() } as Business;
        setBusiness(biz);

        const [s, tp, bpSnap] = await Promise.all([
          getLast30DaysStats("businesses", bizId),
          getTopProducts(bizId, 5),
          getDocs(collection(db, "business_products")),
        ]);
        setStats(s);
        setTopProducts(tp);
        setProductCount(bpSnap.docs.filter(d => d.data().businessId === bizId).length);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [bizId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="spin" /><style>{`.spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!business) return <div style={{ padding: "2rem", color: "#71717a" }}>Biznesi nuk u gjet.</div>;

  const maxViews = Math.max(...(stats?.views || []).map((d: DayData) => d.count), 1);
  const maxContacts = Math.max(...(stats?.contacts || []).map((d: DayData) => d.count), 1);
  const maxMaps = Math.max(...(stats?.maps || []).map((d: DayData) => d.count), 1);

  const planColor: Record<string, string> = { basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316", free: "#71717a" };
  const pc = planColor[business.subscription] || "#71717a";

  const conversionRate = stats?.totalViews > 0
    ? ((stats.totalContacts / stats.totalViews) * 100).toFixed(1)
    : "0.0";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="bs-breadcrumb">
        <Link href="/admin">Dashboard</Link>
        <span>›</span>
        <Link href="/admin/businesses">Bizneset</Link>
        <span>›</span>
        <span>{business.name}</span>
      </div>

      {/* Header */}
      <div className="bs-header">
        <div className="bs-header-left">
          <div className="bs-biz-icon">🏪</div>
          <div>
            <h1 className="bs-title">{business.name}</h1>
            <p className="bs-meta">{business.category} · 📍 {business.city} {business.phone && `· 📞 ${business.phone}`}</p>
          </div>
        </div>
        <div className="bs-badges">
          <span className="bs-plan-badge" style={{ color: pc, borderColor: `${pc}40`, background: `${pc}12` }}>
            {business.subscription || "free"}
          </span>
          <span className={`bs-status ${business.verified ? "verified" : "pending"}`}>
            {business.verified ? "✓ Verifikuar" : "⏳ Pritje"}
          </span>
          {business.featured && <span className="bs-featured">⭐ Featured</span>}
        </div>
      </div>

      {/* KPI Kryesore */}
      <div className="bs-kpi-grid">
        {[
          { label: "Vizita Totale", value: stats?.totalViews || 0, icon: "👁", color: "#3b82f6", sub: "30 ditë" },
          { label: "Kontakte", value: stats?.totalContacts || 0, icon: "📞", color: "#22c55e", sub: "thirrje direkte" },
          { label: "Klikime Maps", value: stats?.totalMaps || 0, icon: "🗺", color: "#f5c842", sub: "Google Maps" },
          { label: "Produktet", value: productCount, icon: "📦", color: "#f97316", sub: "në platformë" },
        ].map((k, i) => (
          <div key={i} className="bs-kpi-card">
            <div className="bs-kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
            <div className="bs-kpi-val">{k.value.toLocaleString()}</div>
            <div className="bs-kpi-label">{k.label}</div>
            <div className="bs-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Conversion Rate */}
      <div className="bs-conversion">
        <div className="bs-conv-item">
          <span className="bs-conv-label">Shkalla e Konvertimit</span>
          <span className="bs-conv-val" style={{ color: Number(conversionRate) > 5 ? "#22c55e" : Number(conversionRate) > 2 ? "#f5c842" : "#f87171" }}>
            {conversionRate}%
          </span>
          <span className="bs-conv-sub">vizita → kontakt</span>
        </div>
        <div className="bs-conv-item">
          <span className="bs-conv-label">Vizita / Ditë</span>
          <span className="bs-conv-val">{stats?.views?.length > 0 ? (stats.totalViews / 30).toFixed(1) : "0.0"}</span>
          <span className="bs-conv-sub">mesatare 30 ditë</span>
        </div>
        <div className="bs-conv-item">
          <span className="bs-conv-label">Kontakte / Ditë</span>
          <span className="bs-conv-val">{stats?.contacts?.length > 0 ? (stats.totalContacts / 30).toFixed(1) : "0.0"}</span>
          <span className="bs-conv-sub">mesatare 30 ditë</span>
        </div>
        <div className="bs-conv-item">
          <span className="bs-conv-label">Vlera Mujore</span>
          <span className="bs-conv-val" style={{ color: "#22c55e" }}>
            {business.subscription === "basic" ? "1,000" : business.subscription === "advanced" ? "1,500" : business.subscription === "pro" ? "2,500" : "0"} L
          </span>
          <span className="bs-conv-sub">abonimi aktual</span>
        </div>
      </div>

      {/* Grafiku i vizitave */}
      <div className="bs-charts-grid">
        {[
          { title: "👁 Vizitat — 30 Ditë", data: stats?.views || [], max: maxViews, color: "#3b82f6" },
          { title: "📞 Kontaktet — 30 Ditë", data: stats?.contacts || [], max: maxContacts, color: "#22c55e" },
          { title: "🗺 Klikime Maps — 30 Ditë", data: stats?.maps || [], max: maxMaps, color: "#f5c842" },
        ].map((chart, ci) => (
          <div key={ci} className="bs-chart-card">
            <h3 className="bs-chart-title">{chart.title}</h3>
            {chart.data.length === 0 ? (
              <div className="bs-no-data">Nuk ka të dhëna ende</div>
            ) : (
              <div className="bs-bar-chart">
                {chart.data.slice(0, 30).map((d: DayData, i: number) => (
                  <div key={i} className="bs-bar-wrap" title={`${d.date}: ${d.count}`}>
                    <div className="bs-bar" style={{ height: `${Math.max(4, (d.count / chart.max) * 100)}%`, background: chart.color }} />
                    {i % 5 === 0 && <div className="bs-bar-label">{d.date?.slice(5)}</div>}
                  </div>
                ))}
              </div>
            )}
            <div className="bs-chart-total">Total: <strong>{chart.data.reduce((s: number, d: DayData) => s + d.count, 0)}</strong></div>
          </div>
        ))}
      </div>

      {/* Top Produktet */}
      {topProducts.length > 0 && (
        <div className="bs-section-card">
          <h3 className="bs-section-title">🏆 Top Produktet (Pro Plan)</h3>
          <div className="bs-top-products">
            {topProducts.map((p, i) => (
              <div key={p.productId} className="bs-top-prod-row">
                <span className="bs-top-rank" style={{ color: i === 0 ? "#f5c842" : i === 1 ? "#a1a1aa" : "#cd7c2f" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span className="bs-top-prod-name">{p.name}</span>
                <div className="bs-top-bar-wrap">
                  <div className="bs-top-bar" style={{ width: `${(p.count / topProducts[0].count) * 100}%` }} />
                </div>
                <span className="bs-top-count">{p.count} klikime</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Veprime admin */}
      <div className="bs-admin-actions">
        <Link href={`/business/${bizId}`} target="_blank" className="bs-btn-secondary">👁 Shiko Faqen Publike</Link>
        <Link href={`/admin/businesses`} className="bs-btn-secondary">← Kthehu</Link>
      </div>

      <style>{`
        .bs-breadcrumb{display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#71717a;margin-bottom:1.25rem}
        .bs-breadcrumb a{color:#71717a;text-decoration:none}.bs-breadcrumb a:hover{color:#f97316}
        .bs-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
        .bs-header-left{display:flex;align-items:center;gap:14px}
        .bs-biz-icon{width:52px;height:52px;border-radius:12px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.2);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0}
        .bs-title{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.02em;margin-bottom:4px}
        .bs-meta{font-size:0.82rem;color:#71717a}
        .bs-badges{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .bs-plan-badge{font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:6px;border:1px solid;text-transform:uppercase;letter-spacing:0.04em}
        .bs-status{font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:6px}
        .bs-status.verified{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .bs-status.pending{background:rgba(245,200,66,0.1);color:#f5c842;border:1px solid rgba(245,200,66,0.2)}
        .bs-featured{font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:6px;background:rgba(245,200,66,0.1);color:#f5c842;border:1px solid rgba(245,200,66,0.2)}
        .bs-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1rem}
        .bs-kpi-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1.1rem}
        .bs-kpi-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;margin-bottom:0.65rem}
        .bs-kpi-val{font-size:1.8rem;font-weight:800;color:#fff;letter-spacing:-0.02em;margin-bottom:2px}
        .bs-kpi-label{font-size:0.8rem;font-weight:600;color:#e4e4e7;margin-bottom:2px}
        .bs-kpi-sub{font-size:0.7rem;color:#71717a}
        .bs-conversion{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:1.5rem}
        .bs-conv-item{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.9rem;text-align:center}
        .bs-conv-label{display:block;font-size:0.72rem;color:#71717a;margin-bottom:5px}
        .bs-conv-val{display:block;font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:3px}
        .bs-conv-sub{display:block;font-size:0.7rem;color:#52525b}
        .bs-charts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:1.25rem}
        .bs-chart-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1.1rem}
        .bs-chart-title{font-size:0.82rem;font-weight:700;color:#e4e4e7;margin-bottom:0.75rem}
        .bs-no-data{text-align:center;color:#52525b;font-size:0.8rem;padding:1.5rem 0}
        .bs-bar-chart{display:flex;align-items:flex-end;gap:2px;height:80px;padding-bottom:16px;position:relative}
        .bs-bar-wrap{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;position:relative}
        .bs-bar{width:100%;border-radius:2px 2px 0 0;transition:height .3s;min-height:4px}
        .bs-bar-label{position:absolute;bottom:-14px;font-size:8px;color:#52525b;white-space:nowrap}
        .bs-chart-total{font-size:0.75rem;color:#71717a;margin-top:8px;text-align:right}
        .bs-chart-total strong{color:#e4e4e7}
        .bs-section-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1.1rem;margin-bottom:1.25rem}
        .bs-section-title{font-size:0.875rem;font-weight:700;color:#e4e4e7;margin-bottom:1rem}
        .bs-top-products{display:flex;flex-direction:column;gap:8px}
        .bs-top-prod-row{display:flex;align-items:center;gap:10px}
        .bs-top-rank{font-size:1rem;width:28px;text-align:center;flex-shrink:0}
        .bs-top-prod-name{font-size:0.82rem;color:#e4e4e7;min-width:160px}
        .bs-top-bar-wrap{flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden}
        .bs-top-bar{height:100%;background:linear-gradient(90deg,#f97316,#f5c842);border-radius:999px}
        .bs-top-count{font-size:0.75rem;color:#71717a;min-width:80px;text-align:right}
        .bs-admin-actions{display:flex;gap:8px;margin-top:0.5rem;flex-wrap:wrap}
        .bs-btn-secondary{padding:0.6rem 1.2rem;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;border-radius:10px;font-size:0.82rem;font-weight:500;text-decoration:none;transition:all .2s}
        .bs-btn-secondary:hover{border-color:rgba(255,255,255,0.2);color:#fff}
        @media(max-width:900px){.bs-kpi-grid,.bs-conversion{grid-template-columns:repeat(2,1fr)}.bs-charts-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
