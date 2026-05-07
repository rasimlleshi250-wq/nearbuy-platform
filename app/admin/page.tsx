"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Link from "next/link";

interface Stats {
  products: number;
  businesses: number;
  professionals: number;
  categories: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({ products: 0, businesses: 0, professionals: 0, categories: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [p, b, pr, c] = await Promise.all([
          getCountFromServer(collection(db, "products")),
          getCountFromServer(collection(db, "businesses")),
          getCountFromServer(collection(db, "professionals")),
          getCountFromServer(collection(db, "categories")),
        ]);
        setStats({
          products: p.data().count,
          businesses: b.data().count,
          professionals: pr.data().count,
          categories: c.data().count,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Produkte", value: stats.products, icon: "🛍", color: "#f97316", href: "/admin/products" },
    { label: "Biznese", value: stats.businesses, icon: "🏪", color: "#3b82f6", href: "/admin/businesses" },
    { label: "Profesionistë", value: stats.professionals, icon: "👷", color: "#a855f7", href: "/admin/professionals" },
    { label: "Kategori", value: stats.categories, icon: "📁", color: "#22c55e", href: "/admin/categories" },
  ];

  const quickActions = [
    { label: "Shto produkt të ri", href: "/admin/products/new", icon: "➕", desc: "Shto produkt në databazë" },
    { label: "Shto kategori", href: "/admin/categories/new", icon: "📁", desc: "Krijo kategori të re" },
    { label: "Shiko bizneset", href: "/admin/businesses", icon: "🏪", desc: "Aprovo bizneset e reja" },
    { label: "Shiko profesionistët", href: "/admin/professionals", icon: "👷", desc: "Menaxho profesionistët" },
  ];

  return (
    <div>
      <div className="adm-page-header">
        <h1>Overview</h1>
        <p>Mirë se erdhe në panelin e adminit të NearBuy.al</p>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        {cards.map((c, i) => (
          <Link key={i} href={c.href} className="adm-stat-card">
            <div className="adm-stat-icon" style={{ background: `${c.color}18`, color: c.color }}>
              {c.icon}
            </div>
            <div className="adm-stat-val">{loading ? "—" : c.value}</div>
            <div className="adm-stat-label">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="adm-section-title">Veprime të shpejta</div>
      <div className="adm-actions-grid">
        {quickActions.map((a, i) => (
          <Link key={i} href={a.href} className="adm-action-card">
            <span className="adm-action-icon">{a.icon}</span>
            <div>
              <p className="adm-action-title">{a.label}</p>
              <p className="adm-action-desc">{a.desc}</p>
            </div>
            <span className="adm-action-arrow">→</span>
          </Link>
        ))}
      </div>

      <style>{`
        .adm-page-header{margin-bottom:1.75rem}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.3rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
        .adm-stat-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.25rem;text-decoration:none;display:block;transition:border-color .2s,transform .15s}
        .adm-stat-card:hover{border-color:rgba(255,255,255,0.15);transform:translateY(-2px)}
        .adm-stat-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:0.75rem}
        .adm-stat-val{font-size:2rem;font-weight:700;color:#fff;letter-spacing:-0.03em;margin-bottom:0.25rem}
        .adm-stat-label{font-size:0.8rem;color:#71717a}
        .adm-section-title{font-size:0.8rem;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem}
        .adm-actions-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .adm-action-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;gap:14px;text-decoration:none;transition:border-color .2s,background .2s}
        .adm-action-card:hover{border-color:rgba(249,115,22,0.3);background:rgba(249,115,22,0.04)}
        .adm-action-icon{font-size:1.4rem;flex-shrink:0}
        .adm-action-title{font-size:0.875rem;font-weight:600;color:#e4e4e7;margin-bottom:0.2rem}
        .adm-action-desc{font-size:0.78rem;color:#71717a}
        .adm-action-arrow{margin-left:auto;color:#52525b;font-size:1rem;flex-shrink:0}
        @media(max-width:768px){.adm-stats{grid-template-columns:repeat(2,1fr)}.adm-actions-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
