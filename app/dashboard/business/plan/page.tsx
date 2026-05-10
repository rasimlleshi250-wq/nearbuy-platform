"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 1000,
    color: "#3b82f6",
    colorBg: "rgba(59,130,246,0.1)",
    colorBorder: "rgba(59,130,246,0.3)",
    icon: "🏪",
    features: [
      { text: "Listim i dyqanit në NearBuy", included: true },
      { text: "Shfaqet në kërkim", included: true },
      { text: "Menaxhim produktesh", included: true },
      { text: "Raport analytics 1×/muaj", included: true },
      { text: "Analytics real-time", included: false },
      { text: "Prioritet në kërkim", included: false },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    price: 1500,
    color: "#a855f7",
    colorBg: "rgba(168,85,247,0.1)",
    colorBorder: "rgba(168,85,247,0.3)",
    icon: "📊",
    popular: true,
    features: [
      { text: "Listim i dyqanit në NearBuy", included: true },
      { text: "Shfaqet në kërkim", included: true },
      { text: "Menaxhim produktesh", included: true },
      { text: "Raport analytics 1×/muaj", included: true },
      { text: "Analytics real-time + klikime", included: true },
      { text: "Prioritet në kërkim", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 2500,
    color: "#f97316",
    colorBg: "rgba(249,115,22,0.1)",
    colorBorder: "rgba(249,115,22,0.3)",
    icon: "⭐",
    features: [
      { text: "Listim i dyqanit në NearBuy", included: true },
      { text: "Shfaqet në kërkim", included: true },
      { text: "Menaxhim produktesh", included: true },
      { text: "Raport analytics 1×/muaj", included: true },
      { text: "Analytics real-time + klikime", included: true },
      { text: "Prioritet në kërkim (TOP)", included: true },
    ],
  },
];

export default function BusinessPlanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const snap = await getDoc(doc(db, "businesses", user.uid));
      if (!snap.exists()) {
        router.replace("/dashboard/business/setup");
        return;
      }
      const data = snap.data();
      // Nëse ka plan tashmë, ridrejto te dashboard
      if (data.subscription && data.subscription !== "free") {
        router.replace("/dashboard/business");
        return;
      }
      setChecking(false);
    };
    check();
  }, [user, router]);

  const handleConfirm = async () => {
    if (!user || !selected) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "businesses", user.uid), {
        subscription: selected,
        subscriptionStart: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push("/dashboard/business");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <main className="plan-root">
      <div className="plan-blob-a" />
      <div className="plan-blob-b" />
      <div className="plan-grid" />

      <div className="plan-wrap">
        <Link href="/" className="plan-brand">
          <div className="plan-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
              <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
            </svg>
          </div>
          <span>NearBuy<em>.al</em></span>
        </Link>

        <div className="plan-header">
          <h1>Zgjidh planin tënd</h1>
          <p>Fillo me planin që i përshtatet biznesit tënd. Mund ta ndryshosh në çdo kohë.</p>
        </div>

        <div className="plan-cards">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`plan-card ${selected === plan.id ? "selected" : ""} ${plan.popular ? "popular" : ""}`}
              style={{
                borderColor: selected === plan.id ? plan.color : plan.popular ? plan.colorBorder : undefined,
                background: selected === plan.id ? plan.colorBg : undefined,
              }}
            >
              {plan.popular && <div className="plan-popular-badge" style={{ background: plan.color }}>Më i popullarizuar</div>}
              {selected === plan.id && <div className="plan-check" style={{ background: plan.color }}>✓</div>}

              <div className="plan-icon">{plan.icon}</div>
              <h2 className="plan-name" style={{ color: selected === plan.id ? plan.color : undefined }}>{plan.name}</h2>
              <div className="plan-price">
                <span className="plan-amount">{plan.price.toLocaleString()}</span>
                <span className="plan-currency"> L/muaj</span>
              </div>

              <div className="plan-features">
                {plan.features.map((f, i) => (
                  <div key={i} className={`plan-feature ${f.included ? "on" : "off"}`}>
                    <span>{f.included ? "✓" : "✗"}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="plan-footer">
          <p className="plan-note">💳 Pagesa bëhet manualisht — ekipi ynë do t'ju kontaktojë pas zgjedhjes.</p>
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="plan-btn"
          >
            {loading ? "Duke konfirmuar..." : selected ? `Konfirmo planin ${PLANS.find(p => p.id === selected)?.name}` : "Zgjidh një plan"}
          </button>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .plan-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #f5f5f4; position: relative; overflow: hidden; }
        .plan-blob-a { position: fixed; width: 500px; height: 500px; border-radius: 50%; filter: blur(120px); background: radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%); top: -150px; right: -100px; pointer-events: none; z-index: 0; }
        .plan-blob-b { position: fixed; width: 400px; height: 400px; border-radius: 50%; filter: blur(120px); background: radial-gradient(circle, rgba(168,85,247,0.08), transparent 70%); bottom: -100px; left: -80px; pointer-events: none; z-index: 0; }
        .plan-grid { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px; }
        .plan-wrap { position: relative; z-index: 1; width: 100%; max-width: 900px; animation: up 0.45s cubic-bezier(.22,.68,0,1.15) both; }
        @keyframes up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .plan-brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 2rem; }
        .plan-brand-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.2); display: flex; align-items: center; justify-content: center; }
        .plan-brand span { font-size: 1.1rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .plan-brand em { color: #f97316; font-style: normal; }
        .plan-header { margin-bottom: 2.5rem; }
        .plan-header h1 { font-size: 2rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; margin-bottom: 0.5rem; }
        .plan-header p { font-size: 0.95rem; color: #71717a; }
        .plan-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-bottom: 2rem; }
        .plan-card { position: relative; background: rgba(20,20,20,0.95); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 1.75rem 1.5rem; cursor: pointer; transition: all 0.2s; }
        .plan-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .plan-card.selected { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .plan-popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 0.72rem; font-weight: 700; color: white; padding: 3px 12px; border-radius: 999px; white-space: nowrap; }
        .plan-check { position: absolute; top: 14px; right: 14px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: white; font-weight: 700; }
        .plan-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .plan-name { font-size: 1.2rem; font-weight: 700; color: #e4e4e7; margin-bottom: 0.5rem; transition: color 0.2s; }
        .plan-price { margin-bottom: 1.5rem; }
        .plan-amount { font-size: 2rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; }
        .plan-currency { font-size: 0.875rem; color: #71717a; }
        .plan-features { display: flex; flex-direction: column; gap: 8px; }
        .plan-feature { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; }
        .plan-feature.on { color: #a1a1aa; }
        .plan-feature.off { color: #3f3f46; }
        .plan-feature.on span:first-child { color: #22c55e; font-weight: 700; }
        .plan-feature.off span:first-child { color: #3f3f46; }
        .plan-footer { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .plan-note { font-size: 0.82rem; color: #52525b; text-align: center; }
        .plan-btn { width: 100%; max-width: 400px; padding: 0.9rem 2rem; background: #f97316; color: white; border: none; border-radius: 14px; font-size: 1rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.2s, transform 0.15s; box-shadow: 0 4px 24px rgba(249,115,22,0.3); }
        .plan-btn:hover:not(:disabled) { background: #ea6c0a; transform: translateY(-1px); }
        .plan-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        @media(max-width: 768px) { .plan-cards { grid-template-columns: 1fr; } .plan-header h1 { font-size: 1.5rem; } }
      `}</style>
    </main>
  );
}
