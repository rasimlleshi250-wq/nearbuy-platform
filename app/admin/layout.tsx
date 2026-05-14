"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, setPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

const NAV = [
  { href: "/admin", label: "Overview", icon: "⊞", exact: true },
  { href: "/admin/products", label: "Produktet", icon: "🛍" },
  { href: "/admin/categories", label: "Kategorinë", icon: "📁" },
  { href: "/admin/subcategories", label: "Nënkategoritë", icon: "📂" },
  { href: "/admin/businesses", label: "Bizneset", icon: "🏪" },
  { href: "/admin/professionals", label: "Profesionistët", icon: "👷" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) { router.push("/auth/login"); return; }
      if (profile && profile.role !== "admin") { router.push("/dashboard"); return; }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  if (authLoading || profileLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="nb-spin" />
        <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user || (profile && profile.role !== "admin")) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const initials = profile?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className={`adm-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="adm-sidebar-top">
          <Link href="/" className="adm-brand">
            <div className="adm-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
                <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
              </svg>
            </div>
            <div>
              <span className="adm-brand-name">NearBuy<em>.al</em></span>
              <span className="adm-brand-badge">Admin</span>
            </div>
          </Link>

          <nav className="adm-nav">
            {NAV.map(item => (
              <Link key={item.href} href={item.href}
                className={`adm-nav-item ${isActive(item.href, item.exact) ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}>
                <span className="adm-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="adm-sidebar-bottom">
          <Link href="/dashboard" className="adm-nav-item" style={{ marginBottom: "6px" }}>
            <span className="adm-nav-icon">↩</span>
            <span>Kthehu te Dashboard</span>
          </Link>
          <div className="adm-user">
            <div className="adm-avatar"><span>{initials}</span></div>
            <div className="adm-user-info">
              <p>{profile?.displayName || "Admin"}</p>
              <p>{profile?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth).then(() => router.push("/"))} className="adm-logout">
            Dil
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="adm-main">
        <header className="adm-header">
          <button className="adm-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="adm-header-badge">
            <span className="adm-dot" />
            Panel i Adminit
          </div>
        </header>
        <div className="adm-content">{children}</div>
      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .adm-root{display:flex;min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .adm-sidebar{width:220px;flex-shrink:0;background:#111;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:40;transition:transform .25s}
        .adm-sidebar-top{padding:1.25rem 1rem;flex:1;overflow-y:auto}
        .adm-brand{display:flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:1.75rem}
        .adm-brand-icon{width:34px;height:34px;border-radius:9px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .adm-brand-name{font-size:1rem;font-weight:700;color:#fff;letter-spacing:-0.02em;display:block;line-height:1.2}
        .adm-brand-name em{color:#f97316;font-style:normal}
        .adm-brand-badge{font-size:0.65rem;background:rgba(249,115,22,0.15);color:#f97316;border:1px solid rgba(249,115,22,0.25);border-radius:4px;padding:1px 6px;font-weight:600}
        .adm-nav{display:flex;flex-direction:column;gap:2px}
        .adm-nav-item{display:flex;align-items:center;gap:9px;padding:0.55rem 0.75rem;border-radius:8px;font-size:0.85rem;font-weight:500;color:#71717a;text-decoration:none;transition:background .15s,color .15s;cursor:pointer;border:none;background:none;width:100%;font-family:inherit}
        .adm-nav-item:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .adm-nav-item.active{background:rgba(249,115,22,0.12);color:#f97316}
        .adm-nav-icon{font-size:1rem;width:18px;text-align:center}
        .adm-sidebar-bottom{padding:1rem;border-top:1px solid rgba(255,255,255,0.07)}
        .adm-user{display:flex;align-items:center;gap:8px;padding:0.5rem;margin-bottom:8px}
        .adm-avatar{width:30px;height:30px;border-radius:50%;background:rgba(249,115,22,0.2);border:1.5px solid rgba(249,115,22,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .adm-avatar span{font-size:0.72rem;font-weight:700;color:#f97316}
        .adm-user-info p:first-child{font-size:0.78rem;font-weight:600;color:#e4e4e7}
        .adm-user-info p:last-child{font-size:0.68rem;color:#52525b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
        .adm-logout{width:100%;padding:0.5rem;background:transparent;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#71717a;font-size:0.8rem;cursor:pointer;transition:all .2s;font-family:inherit}
        .adm-logout:hover{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);color:#f87171}
        .adm-main{flex:1;margin-left:220px;min-height:100vh;display:flex;flex-direction:column}
        .adm-header{height:56px;background:rgba(10,10,10,0.9);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;position:sticky;top:0;z-index:30}
        .adm-menu-btn{display:none;background:none;border:none;color:#71717a;font-size:1.2rem;cursor:pointer;padding:4px 8px;border-radius:6px}
        .adm-menu-btn:hover{color:#fff;background:rgba(255,255,255,0.06)}
        .adm-header-badge{display:flex;align-items:center;gap:7px;font-size:0.8rem;color:#71717a;font-weight:500}
        .adm-dot{width:7px;height:7px;background:#22c55e;border-radius:50%}
        .adm-content{padding:1.5rem;flex:1}
        .adm-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:35}
        @media(max-width:768px){.adm-sidebar{transform:translateX(-100%)}.adm-sidebar.open{transform:translateX(0)}.adm-overlay{display:block}.adm-main{margin-left:0}.adm-menu-btn{display:flex}}
      `}</style>
    </div>
  );
}
