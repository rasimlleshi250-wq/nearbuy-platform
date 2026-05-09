"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { Professional } from "@/types";
import Link from "next/link";

export default function ProfessionalDashboardPage() {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "professionals", user.uid));
        if (snap.exists()) setProfessional({ id: snap.id, ...snap.data() } as Professional);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(168,85,247,0.2);border-top-color:#c084fc;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="pro-page">
      <div className="pro-page-header">
        <div>
          <h1>Overview</h1>
          <p>Mirë se erdhe, {professional?.name?.split(" ")[0] || "Profesionist"}! 👋</p>
        </div>
        <Link href="/dashboard/professional/profile" className="pro-btn-edit">✏️ Edito profilin</Link>
      </div>

      {professional && !professional.verified && (
        <div className="pro-alert">
          <span>⏳</span>
          <div>
            <p className="pro-alert-title">Profili juaj është në pritje aprovimi</p>
            <p className="pro-alert-sub">Ekipi i NearBuy.al do të rishikojë profilin tuaj brenda 24 orëve.</p>
          </div>
        </div>
      )}

      {professional && (
        <>
          <div className="pro-profile-card">
            <div className="pro-profile-left">
              <div className="pro-avatar">
                {professional.photo
                  ? <img src={professional.photo} alt={professional.name} />
                  : <span className="pro-avatar-initials">{professional.name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}</span>
                }
              </div>
              <div className="pro-profile-details">
                <h2>{professional.name}</h2>
                <p className="pro-profession">{professional.profession}</p>
                <div className="pro-meta">
                  <span>📍 {professional.city}</span>
                  {professional.pricePerHour && <span>💰 {professional.pricePerHour.toLocaleString()} L/orë</span>}
                  {professional.experience && <span>⏱ {professional.experience}</span>}
                </div>
              </div>
            </div>
            <div className="pro-profile-right">
              <a href={`tel:${professional.phone}`} className="pro-call-btn">
                📞 {professional.phone}
              </a>
            </div>
          </div>

          {professional.services && professional.services.length > 0 && (
            <div className="pro-card">
              <h3 className="pro-card-title">Shërbimet e mia</h3>
              <div className="pro-services">
                {professional.services.map((s: string, i: number) => (
                  <span key={i} className="pro-service-tag">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="pro-card">
            <h3 className="pro-card-title">Statistikat</h3>
            <div className="pro-stats-locked">
              <div className="pro-stat-locked">
                <span>👁</span>
                <p>Shikime të profilit</p>
                <span className="pro-lock">Monthly+</span>
              </div>
              <div className="pro-stat-locked">
                <span>📞</span>
                <p>Kontaktime</p>
                <span className="pro-lock">Monthly+</span>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .pro-page { display: flex; flex-direction: column; gap: 1.25rem; }
        .pro-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .pro-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.025em; margin-bottom: 0.25rem; }
        .pro-page-header p { font-size: 0.85rem; color: #71717a; }
        .pro-btn-edit { padding: 0.6rem 1.2rem; background: rgba(168,85,247,0.12); color: #c084fc; border: 1px solid rgba(168,85,247,0.25); border-radius: 10px; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: background .2s; white-space: nowrap; }
        .pro-btn-edit:hover { background: rgba(168,85,247,0.2); }
        .pro-alert { display: flex; gap: 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 1rem; }
        .pro-alert span:first-child { font-size: 1.2rem; flex-shrink: 0; }
        .pro-alert-title { font-size: 0.875rem; font-weight: 600; color: #fbbf24; margin-bottom: 3px; }
        .pro-alert-sub { font-size: 0.8rem; color: #92400e; }
        .pro-profile-card { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .pro-profile-left { display: flex; align-items: center; gap: 16px; }
        .pro-avatar { width: 64px; height: 64px; border-radius: 50%; background: rgba(168,85,247,0.15); border: 2px solid rgba(168,85,247,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
        .pro-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .pro-avatar-initials { font-size: 1.2rem; font-weight: 700; color: #c084fc; }
        .pro-profile-details h2 { font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .pro-profession { font-size: 0.85rem; color: #f97316; font-weight: 600; margin-bottom: 8px; }
        .pro-meta { display: flex; flex-wrap: wrap; gap: 10px; }
        .pro-meta span { font-size: 0.78rem; color: #71717a; }
        .pro-call-btn { display: flex; align-items: center; gap: 6px; padding: 0.6rem 1rem; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); border-radius: 10px; color: #4ade80; font-size: 0.85rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .pro-card { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.5rem; }
        .pro-card-title { font-size: 0.9rem; font-weight: 700; color: #e4e4e7; margin-bottom: 1rem; }
        .pro-services { display: flex; flex-wrap: wrap; gap: 8px; }
        .pro-service-tag { background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2); border-radius: 999px; padding: 4px 12px; font-size: 0.8rem; color: #c084fc; }
        .pro-stats-locked { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pro-stat-locked { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 1.25rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; opacity: 0.5; text-align: center; }
        .pro-stat-locked span:first-child { font-size: 1.5rem; }
        .pro-stat-locked p { font-size: 0.82rem; color: #71717a; }
        .pro-lock { font-size: 0.65rem; background: rgba(168,85,247,0.12); color: #c084fc; border: 1px solid rgba(168,85,247,0.2); padding: 2px 7px; border-radius: 4px; font-weight: 600; }
        @media(max-width:640px) { .pro-profile-card { flex-direction: column; align-items: flex-start; } }
      `}</style>
    </div>
  );
}
