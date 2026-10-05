"use client";

// Kërkesat për punë nga klientët — vetëm për paketat Pro dhe Premium.

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDoc, getDocs, query, orderBy, limit, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { getEffectiveProPlan, PRO_PLANS, ProPlanDef } from "@/lib/proPlans";
import { whatsappLink } from "@/lib/businessInfo";
import { Job } from "@/lib/jobRequests";

function timeAgo(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor((Date.now() / 1000 - seconds) / 60);
  if (m < 1) return "tani";
  if (m < 60) return `${m} min më parë`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} orë më parë`;
  return `${Math.floor(h / 24)} ditë më parë`;
}

export default function JobsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ProPlanDef>(PRO_PLANS.free);
  const [name, setName] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "professionals", user.uid));
        const data = snap.exists() ? snap.data() : null;
        setName(String(data?.name || ""));
        const p = getEffectiveProPlan(data);
        setPlan(p);
        if (!p.jobRequests) return;
        const js = await getDocs(query(collection(db, "professionals", user.uid, "jobs"), orderBy("createdAt", "desc"), limit(100)));
        const now = Date.now() / 1000;
        setJobs(js.docs.map(d => ({ id: d.id, ...d.data() } as Job)).filter(j => !j.visibleAt || j.visibleAt.seconds <= now));
      } catch (e) { console.error(e); setError("Kërkesat nuk u ngarkuan. Provo përsëri pas pak."); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const markContacted = async (j: Job) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "professionals", user.uid, "jobs", j.id), { status: "contacted" });
      setJobs(prev => prev.map(x => (x.id === j.id ? { ...x, status: "contacted" } : x)));
    } catch (e) { console.error(e); }
  };

  if (loading) return <p style={{ color: "#71717a", padding: "3rem", textAlign: "center" }}>Duke ngarkuar...</p>;

  if (!plan.jobRequests) return (
    <div className="jb-root">
      <h1 className="jb-title">Kërkesat për punë</h1>
      <div className="jb-locked">
        <p style={{ fontSize: "2rem" }}>🔒</p>
        <p className="jb-lock-title">Klientë që kërkojnë mjeshtër në zonën tënde</p>
        <p className="jb-lock-text">
          Kur një klient përshkruan një punë ("më rrjedh bojleri, Durrës, sot"), kërkesa me emrin dhe numrin e tij u shkon
          mjeshtrave me paketën <b>Pro</b> ose <b>Premium</b> që punojnë në atë qytet. Premium e marrin 2 orë më herët.
        </p>
        <Link href="/dashboard/professional" className="jb-btn">Shiko paketat</Link>
      </div>
      <style>{CSS}</style>
    </div>
  );

  const fresh = jobs.filter(j => j.status === "new").length;

  return (
    <div className="jb-root">
      <div>
        <h1 className="jb-title">Kërkesat për punë</h1>
        <p className="jb-sub">
          {jobs.length === 0 ? "Ende s'ka kërkesa." : `${jobs.length} kërkesa · ${fresh} të reja`}
          {plan.id === "standard" && " · Me Premium i merr menjëherë, jo pas 2 orësh."}
        </p>
      </div>
      {error && <div className="jb-err">{error}</div>}
      {jobs.length === 0 && !error && (
        <div className="jb-empty">
          Kur një klient në qytetet ku punon kërkon një mjeshtër si ti, kërkesa del këtu.
          <br />Këshillë: plotëso profilin dhe shto foto punimesh, sepse klientët i zgjedhin ata që duken më seriozë.
        </div>
      )}
      <div className="jb-list">
        {jobs.map(j => {
          const wa = whatsappLink(j.phone, `Përshëndetje ${j.name}, jam ${name}, ${j.profession.toLowerCase()}. Pashë kërkesën tuaj në NearBuy: "${j.description.slice(0, 80)}".`);
          return (
            <div key={j.id} className={`jb-card ${j.status === "new" ? "new" : ""}`}>
              <div className="jb-top">
                <span className="jb-urg">{j.urgency}</span>
                <span className="jb-time">{j.status === "new" && <span className="jb-badge">E re</span>} {timeAgo(j.createdAt?.seconds)}</span>
              </div>
              <p className="jb-desc">"{j.description}"</p>
              <p className="jb-who"><b>{j.name}</b> · {j.city} · {j.phone}</p>
              <div className="jb-actions">
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="jb-wa" onClick={() => markContacted(j)}>💬 WhatsApp</a>}
                <a href={`tel:${j.phone}`} className="jb-call" onClick={() => markContacted(j)}>📞 Telefono</a>
                {j.status === "new"
                  ? <button className="jb-mark" onClick={() => markContacted(j)}>✓ E kontaktova</button>
                  : <span className="jb-done">✓ Kontaktuar</span>}
              </div>
            </div>
          );
        })}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  .jb-root{display:flex;flex-direction:column;gap:1rem;max-width:760px}
  .jb-title{font-size:1.3rem;font-weight:700;color:#f4f4f5}
  .jb-sub{font-size:0.84rem;color:#71717a;margin-top:2px}
  .jb-err{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:10px;padding:0.65rem 1rem;font-size:0.85rem}
  .jb-empty{background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.1);border-radius:14px;padding:1.5rem;color:#a1a1aa;font-size:0.88rem;line-height:1.6}
  .jb-locked{background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:2rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
  .jb-lock-title{font-size:1.05rem;font-weight:700;color:#f4f4f5}
  .jb-lock-text{font-size:0.88rem;color:#a1a1aa;line-height:1.6;max-width:520px}
  .jb-lock-text b{color:#c084fc}
  .jb-btn{margin-top:6px;padding:0.65rem 1.3rem;background:#a855f7;color:#fff;border-radius:10px;text-decoration:none;font-weight:600}
  .jb-list{display:flex;flex-direction:column;gap:10px}
  .jb-card{background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1rem 1.1rem;display:flex;flex-direction:column;gap:8px}
  .jb-card.new{border-color:rgba(192,132,252,0.4);background:rgba(192,132,252,0.05)}
  .jb-top{display:flex;justify-content:space-between;gap:10px}
  .jb-urg{font-size:0.75rem;font-weight:700;color:#f5c842}
  .jb-time{font-size:0.75rem;color:#71717a;display:flex;gap:6px;align-items:center}
  .jb-badge{background:#c084fc;color:#111;font-weight:700;font-size:0.68rem;padding:1px 7px;border-radius:999px}
  .jb-desc{font-size:0.95rem;color:#f4f4f5;line-height:1.5}
  .jb-who{font-size:0.84rem;color:#a1a1aa}
  .jb-who b{color:#fff}
  .jb-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .jb-wa{padding:0.5rem 0.9rem;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-size:0.82rem;font-weight:700}
  .jb-call{padding:0.5rem 0.9rem;background:#a855f7;color:#fff;border-radius:8px;text-decoration:none;font-size:0.82rem;font-weight:700}
  .jb-mark{padding:0.5rem 0.9rem;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#a1a1aa;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:inherit}
  .jb-done{font-size:0.8rem;color:#22c55e}
`;
