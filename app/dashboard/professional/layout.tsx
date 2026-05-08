"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Professional } from "@/types";

const NAV = [
  { href: "/dashboard/professional", label: "Overview", icon: "⊞", exact: true },
  { href: "/dashboard/professional/profile", label: "Profili im", icon: "👤" },
];

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) { router.push("/auth/login"); return; }
      if (profile && profile.role !== "professional" && profile.role !== "admin") {
        router.push("/dashboard"); return;
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const q = query(collection(db, "professionals"), where("ownerUID", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) setProfessional({ id: snap.docs[0].id, ...snap.docs[0].data() } as Professional);
    };
    fetch();
  }, [user]);

  if (authLoading || profileLoading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);
  const initials = profile?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "P";

  return (
    <div className="pro-root">
      <aside className={`pro-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="pro-sidebar-top">
          <Link href="/" className="pro-brand">
            <div className="pro-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
                <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
              </svg>
            </div>
            <div>
              <span className="pro-brand-name">NearBuy<em>.al</em></span>
              <span className="pro-role-badge">Profesionist</span>
            </div>
          </Link>

          {professional && (
            <div className="pro-profile-info">
              <div className="pro-avatar-lg">
                {professional.photo ? <img src={professional.photo} alt={professional.name} /> : <span>{initials}</span>}
              </div>
              <div>
                <p className="pro-prof-name">{professional.name}</p>
                <p className="pro-prof-job">{professional.profession}</p>
                <p className="pro-prof-city">📍 {professional.city}</p>
              </div>
            </div>
          )}

          <nav className="pro-nav">
            {NAV.map(item => (
              <Link key={item.href} href={item.href}
                className={`pro-nav-item ${isActive(item.href, item.exact) ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="pro-sidebar-bottom">
          {professional && !professional.verified && (
            <div className="pro-pending">⏳ Profili në pritje aprovimi</div>
          )}
          <div className="pro-user">
            <div className="pro-avatar-sm"><span>{initials}</span></div>
            <div className="pro-user-info">
              <p>{profile?.displayName}</p>
              <p>{profile?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth).then(() => router.push("/"))} className="pro-logout">Dil</button>
        </div>
      </aside>

      {sidebarOpen && <div className="pro-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="pro-main">
        <header className="pro-header">
          <button className="pro-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div>
            {professional?.verified
              ? <span className="pro-verified">✓ Profil i Verifikuar</span>
              : <span className="pro-unverified">⏳ Në pritje aprovimi</span>
            }
          </div>
        </header>
        <div className="pro-content">{children}</div>
      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .pro-root{display:flex;min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f5f5f4}
        .pro-sidebar{width:230px;flex-shrink:0;background:#111;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:40;transition:transform .25s}
        .pro-sidebar-top{padding:1.25rem 1rem;flex:1;overflow-y:auto}
        .pro-brand{display:flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:1.25rem}
        .pro-brand-icon{width:34px;height:34px;border-radius:9px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pro-brand-name{font-size:1rem;font-weight:700;color:#fff;letter-spacing:-0.02em;display:block;line-height:1.2}
        .pro-brand-name em{color:#f97316;font-style:normal}
        .pro-role-badge{font-size:0.65rem;background:rgba(168,85,247,0.15);color:#c084fc;border:1px solid rgba(168,85,247,0.25);border-radius:4px;padding:1px 6px;font-weight:600;display:inline-block;margin-top:2px}
        .pro-profile-info{display:flex;align-items:center;gap:10px;padding:0.75rem;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:1.25rem;border:1px solid rgba(255,255,255,0.07)}
        .pro-avatar-lg{width:42px;height:42px;border-radius:50%;background:rgba(168,85,247,0.2);border:2px solid rgba(168,85,247,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
        .pro-avatar-lg img{width:100%;height:100%;object-fit:cover}
        .pro-avatar-lg span{font-size:0.9rem;font-weight:700;color:#c084fc}
        .pro-prof-name{font-size:0.82rem;font-weight:600;color:#e4e4e7;margin-bottom:1px}
        .pro-prof-job{font-size:0.72rem;color:#f97316;margin-bottom:1px}
        .pro-prof-city{font-size:0.7rem;color:#71717a}
        .pro-nav{display:flex;flex-direction:column;gap:2px}
        .pro-nav-item{display:flex;align-items:center;gap:9px;padding:0.55rem 0.75rem;border-radius:8px;font-size:0.85rem;font-weight:500;color:#71717a;text-decoration:none;transition:background .15s,color .15s}
        .pro-nav-item:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .pro-nav-item.active{background:rgba(168,85,247,0.12);color:#c084fc}
        .pro-sidebar-bottom{padding:1rem;border-top:1px solid rgba(255,255,255,0.07)}
        .pro-pending{font-size:0.75rem;color:#fbbf24;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:10px;text-align:center}
        .pro-user{display:flex;align-items:center;gap:8px;padding:0.5rem;margin-bottom:8px}
        .pro-avatar-sm{width:30px;height:30px;border-radius:50%;background:rgba(168,85,247,0.2);border:1.5px solid rgba(168,85,247,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pro-avatar-sm span{font-size:0.72rem;font-weight:700;color:#c084fc}
        .pro-user-info p:first-child{font-size:0.78rem;font-weight:600;color:#e4e4e7}
        .pro-user-info p:last-child{font-size:0.68rem;color:#52525b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
        .pro-logout{width:100%;padding:0.5rem;background:transparent;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#71717a;font-size:0.8rem;cursor:pointer;transition:all .2s;font-family:inherit}
        .pro-logout:hover{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);color:#f87171}
        .pro-main{flex:1;margin-left:230px;min-height:100vh;display:flex;flex-direction:column}
        .pro-header{height:56px;background:rgba(10,10,10,0.9);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;position:sticky;top:0;z-index:30}
        .pro-menu-btn{display:none;background:none;border:none;color:#71717a;font-size:1.2rem;cursor:pointer;padding:4px 8px;border-radius:6px}
        .pro-menu-btn:hover{color:#fff}
        .pro-verified{font-size:0.78rem;color:#22c55e;font-weight:600;background:rgba(34,197,94,0.1);padding:4px 10px;border-radius:6px;border:1px solid rgba(34,197,94,0.2)}
        .pro-unverified{font-size:0.78rem;color:#fbbf24;font-weight:500;background:rgba(245,158,11,0.08);padding:4px 10px;border-radius:6px;border:1px solid rgba(245,158,11,0.15)}
        .pro-content{padding:1.5rem;flex:1}
        .pro-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:35}
        @media(max-width:768px){.pro-sidebar{transform:translateX(-100%)}.pro-sidebar.open{transform:translateX(0)}.pro-overlay{display:block}.pro-main{margin-left:0}.pro-menu-btn{display:flex}}
      `}</style>
    </div>
  );
}
