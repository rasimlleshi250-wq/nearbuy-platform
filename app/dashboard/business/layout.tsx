"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Business } from "@/types";

const NAV = [
  { href: "/dashboard/business", label: "Overview", icon: "⊞", exact: true },
  { href: "/dashboard/business/products", label: "Produktet", icon: "🛍" },
  { href: "/dashboard/business/profile", label: "Profili", icon: "🏪" },
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) { router.push("/auth/login"); return; }
      if (profile && profile.role !== "business" && profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const q = query(collection(db, "businesses"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) setBusiness({ id: snap.docs[0].id, ...snap.docs[0].data() } as Business);
    };
    fetch();
  }, [user]);

  if (authLoading || profileLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="nb-spin" />
        <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const initials = profile?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "B";

  const planColor = { basic: "#3b82f6", advanced: "#a855f7", pro: "#f97316", free: "#71717a" };
  const plan = (business?.subscription || "basic") as keyof typeof planColor;

  return (
    <div className="biz-root">
      <aside className={`biz-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="biz-sidebar-top">
          <Link href="/" className="biz-brand">
            <div className="biz-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
                <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
              </svg>
            </div>
            <div>
              <span className="biz-brand-name">NearBuy<em>.al</em></span>
              {business && (
                <span className="biz-plan-badge" style={{ background: `${planColor[plan]}22`, color: planColor[plan], borderColor: `${planColor[plan]}44` }}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </span>
              )}
            </div>
          </Link>

          {business && (
            <div className="biz-shop-info">
              <div className="biz-shop-logo">
                {business.logo ? <img src={business.logo} alt={business.name} /> : <span>🏪</span>}
              </div>
              <div>
                <p className="biz-shop-name">{business.name}</p>
                <p className="biz-shop-city">{business.city}</p>
              </div>
            </div>
          )}

          <nav className="biz-nav">
            {NAV.map(item => (
              <Link key={item.href} href={item.href}
                className={`biz-nav-item ${isActive(item.href, item.exact) ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}>
                <span className="biz-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="biz-sidebar-bottom">
          {business && !business.verified && (
            <div className="biz-pending">
              ⏳ Llogaria në pritje aprovimi
            </div>
          )}
          <div className="biz-user">
            <div className="biz-avatar"><span>{initials}</span></div>
            <div className="biz-user-info">
              <p>{profile?.displayName || "Biznes"}</p>
              <p>{profile?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth).then(() => router.push("/"))} className="biz-logout">
            Dil
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="biz-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="biz-main">
        <header className="biz-header">
          <button className="biz-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="biz-header-right">
            {business?.verified
              ? <span className="biz-verified">✓ Biznes i Verifikuar</span>
              : <span className="biz-unverified">⏳ Në pritje aprovimi</span>
            }
          </div>
        </header>
        <div className="biz-content">{children}</div>
      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .biz-root{display:flex;min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .biz-sidebar{width:230px;flex-shrink:0;background:#111;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:40;transition:transform .25s}
        .biz-sidebar-top{padding:1.25rem 1rem;flex:1;overflow-y:auto}
        .biz-brand{display:flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:1.25rem}
        .biz-brand-icon{width:34px;height:34px;border-radius:9px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .biz-brand-name{font-size:1rem;font-weight:700;color:#fff;letter-spacing:-0.02em;display:block;line-height:1.2}
        .biz-brand-name em{color:#f97316;font-style:normal}
        .biz-plan-badge{font-size:0.65rem;padding:1px 7px;border-radius:4px;font-weight:600;border:1px solid;display:inline-block;margin-top:2px}
        .biz-shop-info{display:flex;align-items:center;gap:10px;padding:0.75rem;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:1.25rem;border:1px solid rgba(255,255,255,0.07)}
        .biz-shop-logo{width:36px;height:36px;border-radius:8px;background:rgba(249,115,22,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
        .biz-shop-logo img{width:100%;height:100%;object-fit:cover}
        .biz-shop-logo span{font-size:1.1rem}
        .biz-shop-name{font-size:0.82rem;font-weight:600;color:#e4e4e7;margin-bottom:1px}
        .biz-shop-city{font-size:0.72rem;color:#71717a}
        .biz-nav{display:flex;flex-direction:column;gap:2px}
        .biz-nav-item{display:flex;align-items:center;gap:9px;padding:0.55rem 0.75rem;border-radius:8px;font-size:0.85rem;font-weight:500;color:#71717a;text-decoration:none;transition:background .15s,color .15s}
        .biz-nav-item:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .biz-nav-item.active{background:rgba(249,115,22,0.12);color:#f97316}
        .biz-nav-icon{font-size:1rem;width:18px;text-align:center}
        .biz-sidebar-bottom{padding:1rem;border-top:1px solid rgba(255,255,255,0.07)}
        .biz-pending{font-size:0.75rem;color:#fbbf24;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:10px;text-align:center}
        .biz-user{display:flex;align-items:center;gap:8px;padding:0.5rem;margin-bottom:8px}
        .biz-avatar{width:30px;height:30px;border-radius:50%;background:rgba(249,115,22,0.2);border:1.5px solid rgba(249,115,22,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .biz-avatar span{font-size:0.72rem;font-weight:700;color:#f97316}
        .biz-user-info p:first-child{font-size:0.78rem;font-weight:600;color:#e4e4e7}
        .biz-user-info p:last-child{font-size:0.68rem;color:#52525b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
        .biz-logout{width:100%;padding:0.5rem;background:transparent;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#71717a;font-size:0.8rem;cursor:pointer;transition:all .2s;font-family:inherit}
        .biz-logout:hover{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);color:#f87171}
        .biz-main{flex:1;margin-left:230px;min-height:100vh;display:flex;flex-direction:column}
        .biz-header{height:56px;background:rgba(10,10,10,0.9);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;position:sticky;top:0;z-index:30}
        .biz-menu-btn{display:none;background:none;border:none;color:#71717a;font-size:1.2rem;cursor:pointer;padding:4px 8px;border-radius:6px}
        .biz-menu-btn:hover{color:#fff;background:rgba(255,255,255,0.06)}
        .biz-header-right{display:flex;align-items:center;gap:12px}
        .biz-verified{font-size:0.78rem;color:#22c55e;font-weight:600;background:rgba(34,197,94,0.1);padding:4px 10px;border-radius:6px;border:1px solid rgba(34,197,94,0.2)}
        .biz-unverified{font-size:0.78rem;color:#fbbf24;font-weight:500;background:rgba(245,158,11,0.08);padding:4px 10px;border-radius:6px;border:1px solid rgba(245,158,11,0.15)}
        .biz-content{padding:1.5rem;flex:1}
        .biz-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:35}
        @media(max-width:768px){.biz-sidebar{transform:translateX(-100%)}.biz-sidebar.open{transform:translateX(0)}.biz-overlay{display:block}.biz-main{margin-left:0}.biz-menu-btn{display:flex}}
      `}</style>
    </div>
  );
}
