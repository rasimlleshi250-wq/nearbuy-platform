"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard", href: "/dashboard", active: true },
  { icon: "🛍", label: "Produktet", href: "/dashboard/products", active: false },
  { icon: "📦", label: "Porositë", href: "/dashboard/orders", active: false },
  { icon: "💬", label: "Mesazhet", href: "/dashboard/messages", active: false },
  { icon: "📊", label: "Statistikat", href: "/dashboard/stats", active: false },
  { icon: "⚙️", label: "Cilësimet", href: "/dashboard/settings", active: false },
];

const STATS = [
  { label: "Produktet aktive", value: "0", change: "", icon: "🛍", color: "#f97316" },
  { label: "Shikime sot", value: "0", change: "", icon: "👁", color: "#3b82f6" },
  { label: "Porosi të reja", value: "0", change: "", icon: "📦", color: "#22c55e" },
  { label: "Të ardhura", value: "0 L", change: "", icon: "💰", color: "#a855f7" },
];

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const firstName = user?.displayName?.split(" ")[0] || "Mik";

  return (
    <div className="nb-dash">
      {/* ── Sidebar ── */}
      <aside className={`nb-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="nb-sidebar-top">
          <Link href="/" className="nb-brand">
            <div className="nb-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
                <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
              </svg>
            </div>
            <span>NearBuy<em>.al</em></span>
          </Link>

          <nav className="nb-nav">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={`nb-nav-item ${item.active ? "active" : ""}`}>
                <span className="nb-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="nb-sidebar-bottom">
          <div className="nb-user-card">
            <div className="nb-avatar">
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" />
                : <span>{initials}</span>
              }
            </div>
            <div className="nb-user-info">
              <p className="nb-user-name">{user?.displayName || "Përdorues"}</p>
              <p className="nb-user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="nb-logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Dil
          </button>
        </div>
      </aside>

      {/* ── Overlay mobile ── */}
      {sidebarOpen && <div className="nb-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <main className="nb-main">
        {/* Header */}
        <header className="nb-header">
          <div className="nb-header-left">
            <button className="nb-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div>
              <h1 className="nb-page-title">Dashboard</h1>
              <p className="nb-page-sub">Mirë se erdhe, {firstName}! 👋</p>
            </div>
          </div>
          <div className="nb-header-right">
            <button className="nb-notif-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="nb-notif-dot" />
            </button>
            <div className="nb-header-avatar">
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" />
                : <span>{initials}</span>
              }
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="nb-content">

          {/* Stats Grid */}
          <div className="nb-stats-grid">
            {STATS.map((stat, i) => (
              <div key={i} className="nb-stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="nb-stat-top">
                  <div className="nb-stat-icon" style={{ background: `${stat.color}18`, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <span className="nb-stat-change">{stat.change}</span>
                </div>
                <div className="nb-stat-value">{stat.value}</div>
                <div className="nb-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Two columns */}
          <div className="nb-grid-2">
            {/* Quick actions */}
            <div className="nb-card">
              <h2 className="nb-card-title">Veprime të shpejta</h2>
              <div className="nb-actions">
                <button className="nb-action-btn nb-action-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Shto produkt
                </button>
                <button className="nb-action-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                  </svg>
                  Menaxho kategorinë
                </button>
                <button className="nb-action-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Edito profilin
                </button>
                <button className="nb-action-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  Shiko statistikat
                </button>
              </div>
            </div>

            {/* Account info */}
            <div className="nb-card">
              <h2 className="nb-card-title">Informacioni i llogarisë</h2>
              <div className="nb-info-list">
                <div className="nb-info-row">
                  <span className="nb-info-label">Emri</span>
                  <span className="nb-info-val">{user?.displayName || "—"}</span>
                </div>
                <div className="nb-info-row">
                  <span className="nb-info-label">Email</span>
                  <span className="nb-info-val">{user?.email}</span>
                </div>
                <div className="nb-info-row">
                  <span className="nb-info-label">Email konfirmuar</span>
                  <span className={user?.emailVerified ? "nb-badge-ok" : "nb-badge-no"}>
                    {user?.emailVerified ? "✓ Po" : "✗ Jo"}
                  </span>
                </div>
                <div className="nb-info-row">
                  <span className="nb-info-label">Anëtar që nga</span>
                  <span className="nb-info-val">
                    {user?.metadata?.creationTime
                      ? new Date(user.metadata.creationTime).toLocaleDateString("sq-AL")
                      : "—"}
                  </span>
                </div>
                <div className="nb-info-row">
                  <span className="nb-info-label">Hyrja e fundit</span>
                  <span className="nb-info-val">
                    {user?.metadata?.lastSignInTime
                      ? new Date(user.metadata.lastSignInTime).toLocaleDateString("sq-AL")
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Getting started */}
          <div className="nb-card nb-getting-started">
            <h2 className="nb-card-title">🚀 Fillo me NearBuy.al</h2>
            <div className="nb-steps">
              {[
                { step: "1", title: "Plotëso profilin tënd", desc: "Shto foton, numrin e telefonit dhe adresën", done: false },
                { step: "2", title: "Shto produktin e parë", desc: "Publiko produktin ose shërbimin tënd", done: false },
                { step: "3", title: "Konfirmo email-in", desc: "Verifiko adresën tënde të email-it", done: user?.emailVerified || false },
              ].map((s, i) => (
                <div key={i} className={`nb-step ${s.done ? "done" : ""}`}>
                  <div className="nb-step-num">{s.done ? "✓" : s.step}</div>
                  <div>
                    <p className="nb-step-title">{s.title}</p>
                    <p className="nb-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nb-dash {
          display: flex; min-height: 100vh;
          background: #0a0a0a;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          color: #f5f5f4;
        }

        /* ── Sidebar ── */
        .nb-sidebar {
          width: 240px; flex-shrink: 0;
          background: #111; border-right: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; justify-content: space-between;
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 40;
          transition: transform 0.25s ease;
        }
        .nb-sidebar-top { padding: 1.5rem 1rem 1rem; flex: 1; overflow-y: auto; }
        .nb-brand {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; margin-bottom: 2rem; padding: 0 0.25rem;
        }
        .nb-brand-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.2);
          display: flex; align-items: center; justify-content: center;
        }
        .nb-brand span { font-size: 1.05rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .nb-brand em { color: #f97316; font-style: normal; }

        .nb-nav { display: flex; flex-direction: column; gap: 2px; }
        .nb-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 0.6rem 0.75rem; border-radius: 9px;
          font-size: 0.875rem; font-weight: 500; color: #71717a;
          text-decoration: none; transition: background 0.15s, color 0.15s;
        }
        .nb-nav-item:hover { background: rgba(255,255,255,0.05); color: #e4e4e7; }
        .nb-nav-item.active { background: rgba(249,115,22,0.12); color: #f97316; }
        .nb-nav-icon { font-size: 1rem; width: 20px; text-align: center; }

        .nb-sidebar-bottom { padding: 1rem; border-top: 1px solid rgba(255,255,255,0.07); }
        .nb-user-card { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 0.5rem; border-radius: 9px; }
        .nb-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(249,115,22,0.2); border: 1.5px solid rgba(249,115,22,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }
        .nb-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .nb-avatar span { font-size: 0.8rem; font-weight: 700; color: #f97316; }
        .nb-user-info { overflow: hidden; }
        .nb-user-name { font-size: 0.8rem; font-weight: 600; color: #e4e4e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nb-user-email { font-size: 0.7rem; color: #52525b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nb-logout {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 0.55rem; background: transparent;
          border: 1px solid rgba(255,255,255,0.08); border-radius: 9px;
          color: #71717a; font-size: 0.8rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .nb-logout:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #f87171; }

        /* ── Main ── */
        .nb-main { flex: 1; margin-left: 240px; display: flex; flex-direction: column; min-height: 100vh; }

        .nb-header {
          position: sticky; top: 0; z-index: 30;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.5rem; height: 64px;
          background: rgba(10,10,10,0.9); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nb-header-left { display: flex; align-items: center; gap: 12px; }
        .nb-menu-btn { display: none; background: none; border: none; cursor: pointer; color: #71717a; padding: 6px; border-radius: 8px; transition: color 0.2s, background 0.2s; }
        .nb-menu-btn:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .nb-page-title { font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .nb-page-sub { font-size: 0.78rem; color: #52525b; }
        .nb-header-right { display: flex; align-items: center; gap: 12px; }
        .nb-notif-btn { position: relative; background: none; border: none; cursor: pointer; color: #71717a; padding: 8px; border-radius: 9px; display: flex; transition: color 0.2s, background 0.2s; }
        .nb-notif-btn:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .nb-notif-dot { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; background: #f97316; border-radius: 50%; border: 1.5px solid #0a0a0a; }
        .nb-header-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(249,115,22,0.2); border: 1.5px solid rgba(249,115,22,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700; color: #f97316; overflow: hidden; cursor: pointer;
        }
        .nb-header-avatar img { width: 100%; height: 100%; object-fit: cover; }

        /* ── Content ── */
        .nb-content { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }

        /* Stats */
        .nb-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .nb-stat-card {
          background: #141414; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 1.25rem;
          animation: up 0.4s cubic-bezier(.22,.68,0,1.15) both;
        }
        @keyframes up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .nb-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
        .nb-stat-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .nb-stat-change { font-size: 0.75rem; color: #52525b; }
        .nb-stat-value { font-size: 1.75rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; margin-bottom: 0.25rem; }
        .nb-stat-label { font-size: 0.78rem; color: #71717a; }

        /* Cards */
        .nb-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .nb-card {
          background: #141414; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 1.5rem;
        }
        .nb-card-title { font-size: 0.9rem; font-weight: 700; color: #e4e4e7; margin-bottom: 1.25rem; letter-spacing: -0.01em; }

        /* Actions */
        .nb-actions { display: flex; flex-direction: column; gap: 8px; }
        .nb-action-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 0.7rem 1rem; border-radius: 10px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: #a1a1aa; font-size: 0.85rem; font-weight: 500;
          cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: left;
        }
        .nb-action-btn:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.15); }
        .nb-action-primary {
          background: rgba(249,115,22,0.12) !important;
          border-color: rgba(249,115,22,0.3) !important;
          color: #f97316 !important;
        }
        .nb-action-primary:hover { background: rgba(249,115,22,0.2) !important; }

        /* Info list */
        .nb-info-list { display: flex; flex-direction: column; }
        .nb-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.65rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;
        }
        .nb-info-row:last-child { border-bottom: none; }
        .nb-info-label { color: #71717a; }
        .nb-info-val { color: #e4e4e7; font-weight: 500; }
        .nb-badge-ok { color: #22c55e; font-size: 0.8rem; font-weight: 600; }
        .nb-badge-no { color: #f87171; font-size: 0.8rem; font-weight: 600; }

        /* Getting started */
        .nb-getting-started {}
        .nb-steps { display: flex; flex-direction: column; gap: 0; }
        .nb-step {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .nb-step:last-child { border-bottom: none; padding-bottom: 0; }
        .nb-step-num {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; color: #71717a;
        }
        .nb-step.done .nb-step-num { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #22c55e; }
        .nb-step-title { font-size: 0.875rem; font-weight: 600; color: #e4e4e7; margin-bottom: 0.2rem; }
        .nb-step.done .nb-step-title { color: #52525b; text-decoration: line-through; }
        .nb-step-desc { font-size: 0.78rem; color: #52525b; }

        /* Mobile */
        .nb-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 35; }
        @media (max-width: 768px) {
          .nb-sidebar { transform: translateX(-100%); }
          .nb-sidebar.open { transform: translateX(0); }
          .nb-overlay { display: block; }
          .nb-main { margin-left: 0; }
          .nb-menu-btn { display: flex; }
          .nb-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .nb-grid-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .nb-stats-grid { grid-template-columns: 1fr 1fr; }
          .nb-content { padding: 1rem; }
        }
      `}</style>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
