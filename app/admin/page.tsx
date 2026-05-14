"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getTotalStats } from "@/lib/firebase/analytics";
import Link from "next/link";

interface Business {
  id: string;
  name: string;
  city: string;
  category: string;
  verified: boolean;
  subscription: string;
  featured: boolean;
  phone?: string;
  createdAt?: any;
}

interface BizStats {
  totalViews: number;
  totalContacts: number;
}

interface PlatformStats {
  totalProducts: number;
  activeProducts: number;
  productsWithPhoto: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingBusinesses: number;
  basicPlan: number;
  advancedPlan: number;
  proPlan: number;
  freePlan: number;
  totalProfessionals: number;
  verifiedProfessionals: number;
  totalBusinessProducts: number;
  monthlyRevenue: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats>({
    totalProducts: 0, activeProducts: 0, productsWithPhoto: 0,
    totalBusinesses: 0, verifiedBusinesses: 0, pendingBusinesses: 0,
    basicPlan: 0, advancedPlan: 0, proPlan: 0, freePlan: 0,
    totalProfessionals: 0, verifiedProfessionals: 0,
    totalBusinessProducts: 0, monthlyRevenue: 0,
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bizStats, setBizStats] = useState<Record<string, BizStats>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sortBy, setSortBy] = useState<"views" | "contacts" | "name">("views");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        // Produktet
        const prodSnap = await getDocs(collection(db, "products"));
        const products = prodSnap.docs.map(d => d.data());

        // Bizneset
        const bizSnap = await getDocs(collection(db, "businesses"));
        const bizList = bizSnap.docs.map(d => ({ id: d.id, ...d.data() } as Business));

        // Profesionistet
        const proSnap = await getDocs(collection(db, "professionals"));
        const pros = proSnap.docs.map(d => d.data());

        // Business products
        const bpSnap = await getDocs(collection(db, "business_products"));

        const basic = bizList.filter(b => b.subscription === "basic").length;
        const advanced = bizList.filter(b => b.subscription === "advanced").length;
        const pro = bizList.filter(b => b.subscription === "pro").length;

        setStats({
          totalProducts: products.length,
          activeProducts: products.filter(p => p.status === "active").length,
          productsWithPhoto: products.filter(p => p.images?.length > 0).length,
          totalBusinesses: bizList.length,
          verifiedBusinesses: bizList.filter(b => b.verified).length,
          pendingBusinesses: bizList.filter(b => !b.verified).length,
          basicPlan: basic,
          advancedPlan: advanced,
          proPlan: pro,
          freePlan: bizList.filter(b => !b.subscription || b.subscription === "free").length,
          totalProfessionals: pros.length,
          verifiedProfessionals: pros.filter(p => p.verified).length,
          totalBusinessProducts: bpSnap.size,
          monthlyRevenue: basic * 1000 + advanced * 1500 + pro * 2500,
        });

        setBusinesses(bizList);

        // Ngarko analytics per çdo biznes
        setLoadingStats(true);
        const statsMap: Record<string, BizStats> = {};
        await Promise.all(
          bizList.map(async (b) => {
            const s = await getTotalStats("businesses", b.id);
            statsMap[b.id] = s;
          })
        );
        setBizStats(statsMap);
        setLoadingStats(false);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = businesses
    .filter(b => !search || b.name?.toLowerCase().includes(search.toLowerCase()) || b.city?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "views") return (bizStats[b.id]?.totalViews || 0) - (bizStats[a.id]?.totalViews || 0);
      if (sortBy === "contacts") return (bizStats[b.id]?.totalContacts || 0) - (bizStats[a.id]?.totalContacts || 0);
      return (a.name || "").localeCompare(b.name || "");
    });

  const photoPercent = stats.totalProducts > 0 ? Math.round(stats.productsWithPhoto / stats.totalProducts * 100) : 0;

  return (
    <div>
      <div className="ov-header">
        <div>
          <h1>Dashboard</h1>
          <p>Statistikat e plota te platformes NearBuy.al</p>
        </div>
        <div className="ov-date">{new Date().toLocaleDateString("sq-AL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      {/* ── KPI Kryesore ── */}
      <div className="ov-kpi-grid">
        {[
          { label: "Biznese Gjithsej", value: stats.totalBusinesses, sub: `${stats.verifiedBusinesses} verifikuar · ${stats.pendingBusinesses} pritje`, color: "#3b82f6", icon: "🏪", href: "/admin/businesses" },
          { label: "Produkte", value: stats.totalProducts, sub: `${stats.activeProducts} aktive · ${photoPercent}% me foto`, color: "#f97316", icon: "🛍", href: "/admin/products" },
          { label: "Profesionistë", value: stats.totalProfessionals, sub: `${stats.verifiedProfessionals} verifikuar`, color: "#a855f7", icon: "👷", href: "/admin/professionals" },
          { label: "Prod. Biznese", value: stats.totalBusinessProducts, sub: "produkte të shtuara", color: "#22c55e", icon: "📦", href: "/admin/businesses" },
        ].map((c, i) => (
          <Link key={i} href={c.href} className="ov-kpi-card">
            <div className="ov-kpi-icon" style={{ background: `${c.color}18`, color: c.color }}>{c.icon}</div>
            <div className="ov-kpi-val">{loading ? "—" : c.value}</div>
            <div className="ov-kpi-label">{c.label}</div>
            <div className="ov-kpi-sub">{c.sub}</div>
          </Link>
        ))}
      </div>

      {/* ── Te ardhurat & Planet ── */}
      <div className="ov-row2">
        <div className="ov-card">
          <h2 className="ov-card-title">💰 Të Ardhurat Mujore</h2>
          <div className="ov-revenue">
            <div className="ov-revenue-main">{stats.monthlyRevenue.toLocaleString()} L</div>
            <div className="ov-revenue-sub">nga abonentet aktivë</div>
          </div>
          <div className="ov-plans">
            {[
              { name: "Free", count: stats.freePlan, color: "#71717a", price: 0 },
              { name: "Basic", count: stats.basicPlan, color: "#3b82f6", price: 1000 },
              { name: "Advanced", count: stats.advancedPlan, color: "#a855f7", price: 1500 },
              { name: "Pro", count: stats.proPlan, color: "#f97316", price: 2500 },
            ].map(p => (
              <div key={p.name} className="ov-plan-row">
                <span className="ov-plan-dot" style={{ background: p.color }} />
                <span className="ov-plan-name">{p.name}</span>
                <span className="ov-plan-count">{loading ? "—" : p.count} biznese</span>
                <span className="ov-plan-rev" style={{ color: p.price > 0 ? "#22c55e" : "#52525b" }}>
                  {p.price > 0 ? `${(p.count * p.price).toLocaleString()} L/muaj` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ov-card">
          <h2 className="ov-card-title">📊 Gjendja e Platformes</h2>
          <div className="ov-health-list">
            {[
              { label: "Biznese të verifikuara", val: `${stats.verifiedBusinesses}/${stats.totalBusinesses}`, pct: stats.totalBusinesses > 0 ? Math.round(stats.verifiedBusinesses/stats.totalBusinesses*100) : 0, color: "#22c55e" },
              { label: "Produkte me foto", val: `${stats.productsWithPhoto}/${stats.totalProducts}`, pct: photoPercent, color: "#f97316" },
              { label: "Biznese me abonement", val: `${stats.basicPlan + stats.advancedPlan + stats.proPlan}/${stats.totalBusinesses}`, pct: stats.totalBusinesses > 0 ? Math.round((stats.basicPlan + stats.advancedPlan + stats.proPlan)/stats.totalBusinesses*100) : 0, color: "#3b82f6" },
              { label: "Profesionistë verifikuar", val: `${stats.verifiedProfessionals}/${stats.totalProfessionals}`, pct: stats.totalProfessionals > 0 ? Math.round(stats.verifiedProfessionals/stats.totalProfessionals*100) : 0, color: "#a855f7" },
            ].map((h, i) => (
              <div key={i} className="ov-health-item">
                <div className="ov-health-top">
                  <span className="ov-health-label">{h.label}</span>
                  <span className="ov-health-val">{h.val} <span style={{ color: h.color }}>({h.pct}%)</span></span>
                </div>
                <div className="ov-progress-bg">
                  <div className="ov-progress-fill" style={{ width: `${h.pct}%`, background: h.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Analytics per çdo Biznes ── */}
      <div className="ov-biz-header">
        <h2 className="ov-section-title">📈 Statistikat e Bizneseve</h2>
        <div className="ov-biz-controls">
          <input type="text" placeholder="Kërko biznes..." value={search}
            onChange={e => setSearch(e.target.value)} className="ov-search" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="ov-sort">
            <option value="views">Renditi: Vizita</option>
            <option value="contacts">Renditi: Kontakte</option>
            <option value="name">Renditi: Emri</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ov-loading">Duke ngarkuar statistikat...</div>
      ) : filtered.length === 0 ? (
        <div className="ov-empty">Nuk u gjetën biznese.</div>
      ) : (
        <div className="ov-biz-table-wrap">
          <table className="ov-biz-table">
            <thead>
              <tr>
                <th>Biznesi</th>
                <th>Plani</th>
                <th>👁 Vizita</th>
                <th>📞 Kontakte</th>
                <th>Statusi</th>
                <th>Veprime</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const bs = bizStats[b.id] || { totalViews: 0, totalContacts: 0 };
                const planColors: Record<string, string> = { basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316", free: "#52525b" };
                const pc = planColors[b.subscription] || "#52525b";
                return (
                  <tr key={b.id}>
                    <td>
                      <div className="ov-biz-cell">
                        <div className="ov-biz-icon">🏪</div>
                        <div>
                          <p className="ov-biz-name">{b.name}</p>
                          <p className="ov-biz-meta">{b.category} · 📍 {b.city}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="ov-plan-badge" style={{ color: pc, borderColor: `${pc}40`, background: `${pc}12` }}>
                        {b.subscription || "free"}
                      </span>
                    </td>
                    <td>
                      <div className="ov-stat-cell">
                        {loadingStats ? <span className="ov-loading-dot" /> : (
                          <>
                            <span className="ov-stat-num">{bs.totalViews.toLocaleString()}</span>
                            <div className="ov-mini-bar">
                              <div className="ov-mini-fill" style={{ width: `${Math.min(100, (bs.totalViews / Math.max(...Object.values(bizStats).map(s => s.totalViews), 1)) * 100)}%`, background: "#3b82f6" }} />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="ov-stat-cell">
                        {loadingStats ? <span className="ov-loading-dot" /> : (
                          <>
                            <span className="ov-stat-num">{bs.totalContacts.toLocaleString()}</span>
                            <div className="ov-mini-bar">
                              <div className="ov-mini-fill" style={{ width: `${Math.min(100, (bs.totalContacts / Math.max(...Object.values(bizStats).map(s => s.totalContacts), 1)) * 100)}%`, background: "#22c55e" }} />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`ov-status ${b.verified ? "verified" : "pending"}`}>
                        {b.verified ? "✓ Verifikuar" : "⏳ Pritje"}
                      </span>
                    </td>
                    <td>
                      <div className="ov-actions">
                        <Link href={`/admin/businesses/${b.id}/stats`} className="ov-btn-stats">📊 Stats</Link>
                        <Link href={`/business/${b.id}`} target="_blank" className="ov-btn-view">👁</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box}
        .ov-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:8px}
        .ov-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .ov-header p{font-size:0.85rem;color:#71717a}
        .ov-date{font-size:0.78rem;color:#52525b;text-align:right}
        .ov-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1.25rem}
        .ov-kpi-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.25rem;text-decoration:none;display:block;transition:border-color .2s,transform .15s}
        .ov-kpi-card:hover{border-color:rgba(255,255,255,0.15);transform:translateY(-2px)}
        .ov-kpi-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin-bottom:0.75rem}
        .ov-kpi-val{font-size:2rem;font-weight:800;color:#fff;letter-spacing:-0.03em;margin-bottom:2px}
        .ov-kpi-label{font-size:0.82rem;font-weight:600;color:#e4e4e7;margin-bottom:3px}
        .ov-kpi-sub{font-size:0.72rem;color:#71717a}
        .ov-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1.5rem}
        .ov-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.25rem}
        .ov-card-title{font-size:0.875rem;font-weight:700;color:#e4e4e7;margin-bottom:1rem}
        .ov-revenue{margin-bottom:1rem}
        .ov-revenue-main{font-size:2rem;font-weight:800;color:#22c55e;letter-spacing:-0.02em}
        .ov-revenue-sub{font-size:0.75rem;color:#71717a;margin-top:2px}
        .ov-plans{display:flex;flex-direction:column;gap:8px}
        .ov-plan-row{display:flex;align-items:center;gap:8px;font-size:0.82rem}
        .ov-plan-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .ov-plan-name{color:#a1a1aa;min-width:60px}
        .ov-plan-count{color:#e4e4e7;flex:1}
        .ov-plan-rev{font-weight:600;font-size:0.8rem}
        .ov-health-list{display:flex;flex-direction:column;gap:12px}
        .ov-health-item{}
        .ov-health-top{display:flex;justify-content:space-between;margin-bottom:5px}
        .ov-health-label{font-size:0.78rem;color:#a1a1aa}
        .ov-health-val{font-size:0.78rem;color:#e4e4e7;font-weight:600}
        .ov-progress-bg{height:5px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden}
        .ov-progress-fill{height:100%;border-radius:999px;transition:width .5s}
        .ov-biz-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:0.75rem;flex-wrap:wrap}
        .ov-section-title{font-size:0.95rem;font-weight:700;color:#e4e4e7}
        .ov-biz-controls{display:flex;gap:8px}
        .ov-search{padding:0.5rem 0.9rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#f4f4f5;font-size:0.82rem;outline:none;font-family:inherit;width:200px}
        .ov-search::placeholder{color:#3f3f46}
        .ov-sort{padding:0.5rem 0.7rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#f4f4f5;font-size:0.82rem;outline:none;font-family:inherit;cursor:pointer}
        .ov-sort option{background:#1c1c1c}
        .ov-loading,.ov-empty{padding:2rem;text-align:center;color:#71717a;font-size:0.875rem}
        .ov-biz-table-wrap{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:auto}
        .ov-biz-table{width:100%;border-collapse:collapse;min-width:700px}
        .ov-biz-table th{padding:0.65rem 1rem;text-align:left;font-size:0.72rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .ov-biz-table td{padding:0.8rem 1rem;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:middle}
        .ov-biz-table tr:last-child td{border-bottom:none}
        .ov-biz-table tr:hover td{background:rgba(255,255,255,0.02)}
        .ov-biz-cell{display:flex;align-items:center;gap:10px}
        .ov-biz-icon{width:34px;height:34px;border-radius:8px;background:rgba(249,115,22,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
        .ov-biz-name{font-size:0.875rem;font-weight:600;color:#e4e4e7;margin-bottom:1px}
        .ov-biz-meta{font-size:0.72rem;color:#71717a}
        .ov-plan-badge{font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:6px;border:1px solid;text-transform:uppercase;letter-spacing:0.04em}
        .ov-stat-cell{display:flex;flex-direction:column;gap:4px}
        .ov-stat-num{font-size:0.875rem;font-weight:700;color:#e4e4e7}
        .ov-mini-bar{height:3px;background:rgba(255,255,255,0.06);border-radius:999px;width:80px;overflow:hidden}
        .ov-mini-fill{height:100%;border-radius:999px}
        .ov-loading-dot{width:16px;height:16px;border:1.5px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ov-status{font-size:0.72rem;font-weight:600;padding:2px 8px;border-radius:6px}
        .ov-status.verified{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .ov-status.pending{background:rgba(245,200,66,0.1);color:#f5c842;border:1px solid rgba(245,200,66,0.2)}
        .ov-actions{display:flex;gap:6px;align-items:center}
        .ov-btn-stats{font-size:0.75rem;padding:4px 10px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.25);color:#f97316;border-radius:6px;text-decoration:none;white-space:nowrap;transition:background .2s}
        .ov-btn-stats:hover{background:rgba(249,115,22,0.2)}
        .ov-btn-view{font-size:0.75rem;padding:4px 8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;border-radius:6px;text-decoration:none;transition:background .2s}
        .ov-btn-view:hover{background:rgba(255,255,255,0.1);color:#fff}
        @media(max-width:900px){.ov-kpi-grid{grid-template-columns:repeat(2,1fr)}.ov-row2{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
