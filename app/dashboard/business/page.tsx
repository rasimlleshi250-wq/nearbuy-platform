"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Business, BusinessProduct } from "@/types";
import Link from "next/link";

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const bizQ = query(collection(db, "businesses"), where("ownerUID", "==", user.uid));
        const bizSnap = await getDocs(bizQ);
        if (bizSnap.empty) { setLoading(false); return; }
        const biz = { id: bizSnap.docs[0].id, ...bizSnap.docs[0].data() } as Business;
        setBusiness(biz);

        const prodQ = query(collection(db, "business_products"), where("businessId", "==", biz.id));
        const prodSnap = await getDocs(prodQ);
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProduct)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const inStock = products.filter(p => p.inStock).length;
  const planColor: Record<string, string> = { basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316" };
  const plan = business?.subscription || "basic";

  return (
    <div className="biz-page">
      {/* Page Header */}
      <div className="biz-page-header">
        <div>
          <h1>Overview</h1>
          <p>Mirë se erdhe, {business?.name || "Biznes"}! 👋</p>
        </div>
        <Link href="/dashboard/business/products" className="biz-btn-primary">
          + Shto produkt
        </Link>
      </div>

      {/* Not verified warning */}
      {business && !business.verified && (
        <div className="biz-alert">
          <span>⏳</span>
          <div>
            <p className="biz-alert-title">Llogaria juaj është në pritje aprovimi</p>
            <p className="biz-alert-sub">Ekipi i NearBuy.al do të rishikojë llogarinë tuaj brenda 24 orëve. Do të njoftoheni me email.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="biz-stats">
        <div className="biz-stat-card">
          <div className="biz-stat-icon" style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>🛍</div>
          <div className="biz-stat-val">{products.length}</div>
          <div className="biz-stat-label">Produkte të listuara</div>
        </div>
        <div className="biz-stat-card">
          <div className="biz-stat-icon" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>✓</div>
          <div className="biz-stat-val">{inStock}</div>
          <div className="biz-stat-label">Në gjendje</div>
        </div>
        <div className="biz-stat-card biz-stat-locked">
          <div className="biz-stat-icon" style={{ background: "rgba(113,113,122,0.12)", color: "#71717a" }}>👁</div>
          <div className="biz-stat-val">—</div>
          <div className="biz-stat-label">Shikime sot</div>
          <div className="biz-lock-badge">Advanced+</div>
        </div>
        <div className="biz-stat-card biz-stat-locked">
          <div className="biz-stat-icon" style={{ background: "rgba(113,113,122,0.12)", color: "#71717a" }}>📊</div>
          <div className="biz-stat-val">—</div>
          <div className="biz-stat-label">Klikime këtë javë</div>
          <div className="biz-lock-badge">Advanced+</div>
        </div>
      </div>

      <div className="biz-grid-2">
        {/* Plan aktual */}
        <div className="biz-card">
          <h2 className="biz-card-title">Plani aktual</h2>
          <div className="biz-plan-box">
            <div className="biz-plan-info">
              <span className="biz-plan-name" style={{ color: planColor[plan] || "#71717a" }}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>
              <span className="biz-plan-price">
                {plan === "basic" ? "1,000 L" : plan === "advanced" ? "2,000 L" : "3,000 L"}/muaj
              </span>
            </div>
            <div className="biz-plan-features">
              <div className="biz-feature">✓ Listim produktesh</div>
              <div className="biz-feature">✓ Shfaqet në kërkim</div>
              {plan === "basic" && <div className="biz-feature biz-feature-locked">✗ Statistika real-time <span className="lock">Advanced</span></div>}
              {(plan === "advanced" || plan === "pro") && <div className="biz-feature">✓ Statistika real-time</div>}
              {plan !== "pro" && <div className="biz-feature biz-feature-locked">✗ Prioritet në kërkim <span className="lock">Pro</span></div>}
              {plan === "pro" && <div className="biz-feature">⭐ Prioritet në kërkim</div>}
            </div>
          </div>
        </div>

        {/* Veprime të shpejta */}
        <div className="biz-card">
          <h2 className="biz-card-title">Veprime të shpejta</h2>
          <div className="biz-actions">
            <Link href="/dashboard/business/products" className="biz-action">
              <span>🛍</span>
              <div>
                <p>Shto produkt nga databaza</p>
                <p>Vendos çmimin tënd</p>
              </div>
              <span className="biz-action-arrow">→</span>
            </Link>
            <Link href="/dashboard/business/profile" className="biz-action">
              <span>🏪</span>
              <div>
                <p>Edito profilin e dyqanit</p>
                <p>Orari, adresa, foto</p>
              </div>
              <span className="biz-action-arrow">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Produktet e fundit */}
      {products.length > 0 && (
        <div className="biz-card">
          <div className="biz-card-header">
            <h2 className="biz-card-title">Produktet e mia</h2>
            <Link href="/dashboard/business/products" className="biz-link">Shiko të gjitha →</Link>
          </div>
          <div className="biz-products-list">
            {products.slice(0, 5).map(p => (
              <div key={p.id} className="biz-product-row">
                <div className="biz-product-info">
                  <span className="biz-product-id">Produkt #{p.productId.slice(-6)}</span>
                  <span className={`biz-stock ${p.inStock ? "in" : "out"}`}>
                    {p.inStock ? "● Në gjendje" : "○ Jo në gjendje"}
                  </span>
                </div>
                <span className="biz-product-price">{p.price.toLocaleString()} L</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .biz-page { display: flex; flex-direction: column; gap: 1.25rem; }
        .biz-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .biz-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.025em; margin-bottom: 0.25rem; }
        .biz-page-header p { font-size: 0.85rem; color: #71717a; }
        .biz-btn-primary { padding: 0.6rem 1.2rem; background: #f97316; color: #fff; border: none; border-radius: 10px; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: background .2s; white-space: nowrap; }
        .biz-btn-primary:hover { background: #ea6c0a; }

        .biz-alert { display: flex; gap: 12px; align-items: flex-start; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 1rem; }
        .biz-alert span:first-child { font-size: 1.2rem; flex-shrink: 0; }
        .biz-alert-title { font-size: 0.875rem; font-weight: 600; color: #fbbf24; margin-bottom: 3px; }
        .biz-alert-sub { font-size: 0.8rem; color: #92400e; }

        .biz-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .biz-stat-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.25rem; position: relative; }
        .biz-stat-locked { opacity: 0.6; }
        .biz-stat-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 0.75rem; }
        .biz-stat-val { font-size: 1.75rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; margin-bottom: 0.25rem; }
        .biz-stat-label { font-size: 0.78rem; color: #71717a; }
        .biz-lock-badge { position: absolute; top: 10px; right: 10px; font-size: 0.65rem; background: rgba(113,113,122,0.15); color: #71717a; border: 1px solid rgba(113,113,122,0.2); padding: 2px 6px; border-radius: 4px; font-weight: 600; }

        .biz-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .biz-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; }
        .biz-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
        .biz-card-title { font-size: 0.9rem; font-weight: 700; color: #e4e4e7; margin-bottom: 1.25rem; }
        .biz-link { font-size: 0.8rem; color: #f97316; text-decoration: none; }
        .biz-link:hover { text-decoration: underline; }

        .biz-plan-box { display: flex; flex-direction: column; gap: 0.75rem; }
        .biz-plan-info { display: flex; align-items: center; justify-content: space-between; }
        .biz-plan-name { font-size: 1.1rem; font-weight: 700; }
        .biz-plan-price { font-size: 0.85rem; color: #71717a; }
        .biz-plan-features { display: flex; flex-direction: column; gap: 6px; }
        .biz-feature { font-size: 0.82rem; color: #a1a1aa; display: flex; align-items: center; gap: 6px; }
        .biz-feature-locked { color: #52525b; }
        .lock { font-size: 0.65rem; background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.25); padding: 1px 6px; border-radius: 4px; }

        .biz-actions { display: flex; flex-direction: column; gap: 8px; }
        .biz-action { display: flex; align-items: center; gap: 12px; padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; text-decoration: none; transition: all .15s; }
        .biz-action:hover { border-color: rgba(249,115,22,0.3); background: rgba(249,115,22,0.04); }
        .biz-action span:first-child { font-size: 1.2rem; flex-shrink: 0; }
        .biz-action p:first-child { font-size: 0.85rem; font-weight: 600; color: #e4e4e7; margin-bottom: 2px; }
        .biz-action p:last-child { font-size: 0.75rem; color: #71717a; }
        .biz-action-arrow { margin-left: auto; color: #52525b; flex-shrink: 0; }

        .biz-products-list { display: flex; flex-direction: column; }
        .biz-product-row { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .biz-product-row:last-child { border-bottom: none; }
        .biz-product-info { display: flex; align-items: center; gap: 12px; }
        .biz-product-id { font-size: 0.85rem; color: #a1a1aa; font-family: monospace; }
        .biz-stock { font-size: 0.75rem; font-weight: 600; }
        .biz-stock.in { color: #22c55e; }
        .biz-stock.out { color: #71717a; }
        .biz-product-price { font-size: 0.9rem; font-weight: 700; color: #f97316; }

        @media(max-width:768px) { .biz-stats{grid-template-columns:repeat(2,1fr)} .biz-grid-2{grid-template-columns:1fr} }
      `}</style>
    </div>
  );
}
