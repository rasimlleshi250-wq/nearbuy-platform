"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

interface Business {
  id: string;
  name: string;
  city: string;
  category: string;
  subscription: string;
  verified: boolean;
  status: string;
  logo?: string;
  phone?: string;
  address?: string;
  description?: string;
}

export default function BusinessOverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        // Kontrollo me uid (setDoc) ose ownerUID (addDoc)
        const docSnap = await getDoc(doc(db, "businesses", user.uid));
        if (docSnap.exists()) {
          setBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
        } else {
          // Kërko me ownerUID si fallback
          const q = query(collection(db, "businesses"), where("ownerUID", "==", user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setBusiness({ id: snap.docs[0].id, ...snap.docs[0].data() } as Business);
          } else {
            router.replace("/dashboard/business/setup");
            return;
          }
        }

        // Numëro produktet
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!business) return null;

  const planColor: Record<string, string> = { basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316", free: "#71717a" };
  const plan = business.subscription || "basic";
  const pc = planColor[plan] || "#71717a";

  return (
    <div className="ov-root">
      {/* Hero card */}
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

      {/* Info */}
      <div className="ov-section-title">Informacioni i dyqanit</div>
      <div className="ov-info-grid">
        {business.phone && (
          <div className="ov-info-row">
            <span className="ov-info-label">📞 Telefoni</span>
            <span className="ov-info-val">{business.phone}</span>
          </div>
        )}
        {business.address && (
          <div className="ov-info-row">
            <span className="ov-info-label">📍 Adresa</span>
            <span className="ov-info-val">{business.address}</span>
          </div>
        )}
        {business.description && (
          <div className="ov-info-row">
            <span className="ov-info-label">📝 Përshkrimi</span>
            <span className="ov-info-val">{business.description}</span>
          </div>
        )}
      </div>

      <style>{`
        .ov-root { display: flex; flex-direction: column; gap: 1.25rem; max-width: 700px; }
        .ov-hero { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.25rem; }
        .ov-hero-left { display: flex; align-items: center; gap: 14px; }
        .ov-logo { width: 52px; height: 52px; border-radius: 12px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; overflow: hidden; }
        .ov-logo img { width: 100%; height: 100%; object-fit: cover; }
        .ov-biz-name { font-size: 1.15rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.02em; }
        .ov-biz-meta { font-size: 0.8rem; color: #71717a; margin-top: 2px; }
        .ov-plan-badge { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 6px; border: 1px solid; }
        .ov-banner { display: flex; align-items: flex-start; gap: 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 1rem; }
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
        .ov-info-grid { display: flex; flex-direction: column; gap: 8px; }
        .ov-info-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 0.75rem 1rem; }
        .ov-info-label { font-size: 0.8rem; color: #71717a; }
        .ov-info-val { font-size: 0.875rem; color: #e4e4e7; font-weight: 500; text-align: right; max-width: 60%; }
        @media (max-width: 480px) { .ov-stats { grid-template-columns: 1fr 1fr; } .ov-actions { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
