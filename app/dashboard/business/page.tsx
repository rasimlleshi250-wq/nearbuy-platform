"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

interface Business {
  id: string;
  name: string;
  city: string;
  category: string;
  subscription: string;
  verified: boolean;
  logo?: string;
  phone?: string;
  address?: string;
  description?: string;
  requestedPlan?: string;
  planStatus?: string;
}

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "1,000",
    color: "#3b82f6",
    features: ["Listim i produkteve", "Profil i dyqanit", "Kërkueshmëri në platformë"],
    notIncluded: ["Statistika real-time", "Prioritet në kërkim", "Badge Featured"],
  },
  {
    id: "advanced",
    name: "Advanced",
    price: "2,000",
    color: "#a855f7",
    popular: true,
    features: ["Listim i produkteve", "Profil i dyqanit", "Kërkueshmëri në platformë", "Statistika real-time"],
    notIncluded: ["Prioritet në kërkim", "Badge Featured"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "3,000",
    color: "#f97316",
    features: ["Listim i produkteve", "Profil i dyqanit", "Kërkueshmëri në platformë", "Statistika real-time", "Prioritet në kërkim", "Badge Featured"],
    notIncluded: [],
  },
];

export default function BusinessOverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [docId, setDocId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestedSuccess, setRequestedSuccess] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const bizSnap = await getDoc(doc(db, "businesses", user.uid));
        if (bizSnap.exists()) {
          setBusiness({ id: bizSnap.id, ...bizSnap.data() } as Business);
          setDocId(user.uid);
        } else {
          const q = query(collection(db, "businesses"), where("ownerUID", "==", user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setBusiness({ id: snap.docs[0].id, ...snap.docs[0].data() } as Business);
            setDocId(snap.docs[0].id);
          } else {
            router.replace("/dashboard/business/setup");
            return;
          }
        }
        const pq = query(collection(db, "business_products"), where("businessId", "==", user.uid));
        const psnap = await getDocs(pq);
        setProductCount(psnap.size);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, router]);

  const handleRequestPlan = async (planId: string) => {
    if (!docId || !business) return;
    if (business.requestedPlan === planId && business.planStatus === "pending") return;
    setRequesting(true);
    try {
      await updateDoc(doc(db, "businesses", docId), {
        requestedPlan: planId,
        planStatus: "pending",
      });
      setBusiness(p => p ? { ...p, requestedPlan: planId, planStatus: "pending" } : p);
      setRequestedSuccess(planId);
      setTimeout(() => setRequestedSuccess(""), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!business) return null;

  const planColor: Record<string, string> = { basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316", free: "#71717a" };
  const plan = business.subscription || "free";
  const pc = planColor[plan] || "#71717a";

  return (
    <div className="ov-root">
      {/* Hero */}
      <div className="ov-hero">
        <div className="ov-hero-left">
          <div className="ov-logo">
            {business.logo ? <img src={business.logo} alt={business.name} /> : <span>🏪</span>}
          </div>
          <div>
            <h1 className="ov-biz-name">{business.name}</h1>
            <p className="ov-biz-meta">{business.category} · {business.city}</p>
          </div>
        </div>
        <span className="ov-plan-badge" style={{ background: `${pc}18`, color: pc, borderColor: `${pc}40` }}>
          {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </span>
      </div>

      {/* Status banner */}
      {!business.verified && (
        <div className="ov-banner">
          <span>⏳</span>
          <div>
            <p className="ov-banner-title">Llogaria në pritje aprovimi</p>
            <p className="ov-banner-sub">Ekipi ynë do të shqyrtojë biznesin tënd brenda 24 orëve.</p>
          </div>
        </div>
      )}

      {/* Plan pending banner */}
      {business.planStatus === "pending" && business.requestedPlan && (
        <div className="ov-banner ov-banner-blue">
          <span>📋</span>
          <div>
            <p className="ov-banner-title" style={{ color: "#93c5fd" }}>Kërkesë plani në pritje</p>
            <p className="ov-banner-sub" style={{ color: "#1e3a5f" }}>
              Ke kërkuar planin <strong style={{ color: "#93c5fd" }}>{business.requestedPlan.charAt(0).toUpperCase() + business.requestedPlan.slice(1)}</strong>. Ekipi ynë do ta aprovojë së shpejti.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="ov-stats">
        <div className="ov-stat">
          <span className="ov-stat-icon">🛍</span>
          <div>
            <p className="ov-stat-val">{productCount}</p>
            <p className="ov-stat-label">Produkte</p>
          </div>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-icon">👁</span>
          <div>
            <p className="ov-stat-val">—</p>
            <p className="ov-stat-label">Shikime</p>
          </div>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-icon">📞</span>
          <div>
            <p className="ov-stat-val">—</p>
            <p className="ov-stat-label">Kontakte</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="ov-section-title">Veprime të shpejta</div>
      <div className="ov-actions">
        <Link href="/dashboard/business/products" className="ov-action">
          <span className="ov-action-icon">➕</span>
          <div>
            <p className="ov-action-title">Shto produkt</p>
            <p className="ov-action-sub">Regjistro produkte të reja</p>
          </div>
        </Link>
        <Link href="/dashboard/business/profile" className="ov-action">
          <span className="ov-action-icon">✏️</span>
          <div>
            <p className="ov-action-title">Edito profilin</p>
            <p className="ov-action-sub">Ndrysho të dhënat e dyqanit</p>
          </div>
        </Link>
      </div>

      {/* Plans */}
      <div className="ov-section-title">Planet e abonimit</div>
      <div className="ov-plans">
        {PLANS.map(p => {
          const isCurrentPlan = business.subscription === p.id;
          const isPending = business.requestedPlan === p.id && business.planStatus === "pending";
          return (
            <div key={p.id} className={`ov-plan ${isCurrentPlan ? "ov-plan-active" : ""} ${p.popular ? "ov-plan-popular" : ""}`}
              style={{ borderColor: isCurrentPlan ? `${p.color}60` : isPending ? `${p.color}40` : undefined }}>
              {p.popular && <div className="ov-plan-tag" style={{ background: p.color }}>Më i popullarit</div>}
              {isCurrentPlan && <div className="ov-plan-tag" style={{ background: p.color }}>Plani juaj</div>}
              {isPending && !isCurrentPlan && <div className="ov-plan-tag" style={{ background: "#52525b" }}>Në pritje</div>}

              <div className="ov-plan-header">
                <p className="ov-plan-name" style={{ color: p.color }}>{p.name}</p>
                <div className="ov-plan-price">
                  <span className="ov-plan-amount">{p.price}</span>
                  <span className="ov-plan-currency">L/muaj</span>
                </div>
              </div>

              <div className="ov-plan-features">
                {p.features.map(f => (
                  <div key={f} className="ov-plan-feat">
                    <span className="ov-feat-check" style={{ color: p.color }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                {p.notIncluded.map(f => (
                  <div key={f} className="ov-plan-feat ov-feat-no">
                    <span className="ov-feat-check">✗</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleRequestPlan(p.id)}
                disabled={requesting || isCurrentPlan || isPending}
                className="ov-plan-btn"
                style={isCurrentPlan || isPending ? {} : { background: p.color, boxShadow: `0 4px 20px ${p.color}40` }}
              >
                {isCurrentPlan ? "Plani aktual" : isPending ? "⏳ Në pritje aprovimi" : requestedSuccess === p.id ? "✓ Kërkesa u dërgua!" : "Zgjidh këtë plan"}
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .ov-root { display: flex; flex-direction: column; gap: 1.25rem; max-width: 780px; }
        .ov-hero { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.25rem; }
        .ov-hero-left { display: flex; align-items: center; gap: 14px; }
        .ov-logo { width: 52px; height: 52px; border-radius: 12px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; overflow: hidden; }
        .ov-logo img { width: 100%; height: 100%; object-fit: cover; }
        .ov-biz-name { font-size: 1.15rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.02em; }
        .ov-biz-meta { font-size: 0.8rem; color: #71717a; margin-top: 2px; }
        .ov-plan-badge { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 6px; border: 1px solid; }
        .ov-banner { display: flex; align-items: flex-start; gap: 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 1rem; }
        .ov-banner-blue { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); }
        .ov-banner span { font-size: 1.2rem; margin-top: 1px; }
        .ov-banner-title { font-size: 0.875rem; font-weight: 600; color: #fbbf24; }
        .ov-banner-sub { font-size: 0.78rem; color: #92400e; margin-top: 2px; }
        .ov-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .ov-stat { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1rem; }
        .ov-stat-icon { font-size: 1.3rem; }
        .ov-stat-val { font-size: 1.3rem; font-weight: 700; color: #f4f4f5; line-height: 1; }
        .ov-stat-label { font-size: 0.72rem; color: #71717a; margin-top: 3px; }
        .ov-section-title { font-size: 0.75rem; font-weight: 600; color: #52525b; text-transform: uppercase; letter-spacing: 0.05em; }
        .ov-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ov-action { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; text-decoration: none; transition: border-color 0.2s, background 0.2s; }
        .ov-action:hover { border-color: rgba(249,115,22,0.3); background: rgba(249,115,22,0.05); }
        .ov-action-icon { font-size: 1.3rem; }
        .ov-action-title { font-size: 0.875rem; font-weight: 600; color: #e4e4e7; }
        .ov-action-sub { font-size: 0.75rem; color: #71717a; margin-top: 1px; }
        .ov-plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .ov-plan { position: relative; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: border-color 0.2s; }
        .ov-plan-active { background: rgba(255,255,255,0.05); }
        .ov-plan-tag { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-size: 0.68rem; font-weight: 700; color: white; padding: 2px 10px; border-radius: 20px; white-space: nowrap; }
        .ov-plan-header { margin-top: 6px; }
        .ov-plan-name { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .ov-plan-price { display: flex; align-items: baseline; gap: 4px; }
        .ov-plan-amount { font-size: 1.6rem; font-weight: 800; color: #f4f4f5; letter-spacing: -0.03em; }
        .ov-plan-currency { font-size: 0.78rem; color: #71717a; }
        .ov-plan-features { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .ov-plan-feat { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: #a1a1aa; }
        .ov-feat-check { font-size: 0.75rem; width: 14px; flex-shrink: 0; }
        .ov-feat-no { opacity: 0.35; }
        .ov-feat-no .ov-feat-check { color: #71717a; }
        .ov-plan-btn { width: 100%; padding: 0.6rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.15s; }
        .ov-plan-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .ov-plan-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        @media (max-width: 640px) { .ov-plans { grid-template-columns: 1fr; } .ov-stats { grid-template-columns: 1fr 1fr; } .ov-actions { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
