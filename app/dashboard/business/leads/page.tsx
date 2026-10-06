"use client";

// Kërkesat e klientëve për produkte që nuk i ka asnjë dyqan — vetëm për Plus dhe Premium.

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { getEffectivePlan, PlanDef, PLANS } from "@/lib/plans";
import { whatsappLink } from "@/lib/businessInfo";
import { Lead } from "@/lib/leads";
import { setLeadStatus } from "@/lib/myRequests";
import { isExpired, EXPIRY_DAYS, CONTACTED_WARNING } from "@/lib/requestRules";

function timeAgo(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor((Date.now() / 1000 - seconds) / 60);
  if (m < 1) return "tani";
  if (m < 60) return `${m} min më parë`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} orë më parë`;
  const d = Math.floor(h / 24);
  return `${d} ditë më parë`;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanDef>(PLANS.free);
  const [bizId, setBizId] = useState("");
  const [bizName, setBizName] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        let id = user.uid;
        let data: Record<string, unknown> | undefined;
        const own = await getDoc(doc(db, "businesses", user.uid));
        if (own.exists()) data = own.data();
        else {
          const s = await getDocs(query(collection(db, "businesses"), where("ownerUID", "==", user.uid)));
          if (!s.empty) { id = s.docs[0].id; data = s.docs[0].data(); }
        }
        setBizId(id);
        setBizName(String(data?.name || ""));
        const p = getEffectivePlan(data || null);
        setPlan(p);
        if (!p.leads) return;
        const snap = await getDocs(query(collection(db, "businesses", id, "leads"), orderBy("createdAt", "desc"), limit(100)));
        const now = Date.now() / 1000;
        setLeads(snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Lead))
          // Plus i sheh kërkesat 2 orë pas Premium
          .filter(l => !l.visibleAt || l.visibleAt.seconds <= now));
      } catch (e) {
        console.error(e);
        setError("Kërkesat nuk u ngarkuan. Provo përsëri pas pak.");
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const [busyId, setBusyId] = useState("");

  const applyResult = (id: string, r: { status: string; contactedCount?: number; closedBy?: string }) =>
    setLeads(prev => prev.map(x => (x.id === id ? {
      ...x,
      status: (r.status === "closed" ? "closed" : r.status === "contacted" ? "contacted" : x.status) as Lead["status"],
      contactedCount: r.contactedCount ?? x.contactedCount,
      closedBy: r.closedBy ?? x.closedBy,
    } : x)));

  const markContacted = async (l: Lead) => {
    if (!user || l.status !== "new") return;
    try { applyResult(l.id, await setLeadStatus("product", l.id, "contacted", user, bizId)); }
    catch (e) { console.error(e); }
  };

  const markSolved = async (l: Lead) => {
    if (!user) return;
    if (!confirm(`Klienti ${l.name} të tha që e gjeti produktin? Kërkesa do të mbyllet edhe për dyqanet e tjera, që të mos e telefonojnë më.`)) return;
    setBusyId(l.id);
    try { applyResult(l.id, await setLeadStatus("product", l.id, "solved", user, bizId)); }
    catch (e) { alert(e instanceof Error ? e.message : "Nuk u ruajt. Provo përsëri."); }
    finally { setBusyId(""); }
  };

  if (loading) return <div className="ld-loading">Duke ngarkuar...<style>{CSS}</style></div>;

  if (!plan.leads) {
    return (
      <div className="ld-root">
        <h1 className="ld-title">Kërkesat e klientëve</h1>
        <div className="ld-locked">
          <p className="ld-lock-icon">🔒</p>
          <p className="ld-lock-title">Klientë që kërkojnë produkte në qytetin tënd</p>
          <p className="ld-lock-text">
            Kur një klient kërkon një produkt që nuk e ka asnjë dyqan në NearBuy, kërkesa me emrin dhe numrin e tij
            u shkon dyqaneve me paketën <b>Plus</b> ose <b>Premium</b> në atë qytet. Premium e marrin të parët.
          </p>
          <Link href="/dashboard/business" className="ld-btn">Shiko paketat</Link>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  const active = leads.filter(l => l.status !== "closed" && !isExpired("product", l.createdAt?.seconds));
  const past = leads.filter(l => !active.includes(l)).slice(0, 30);
  const fresh = active.filter(l => l.status === "new").length;

  const pastReason = (l: Lead) => {
    if (l.status !== "closed") return `Skadoi · më e vjetër se ${EXPIRY_DAYS.product} ditë`;
    if (l.closedBy === bizId) return "E mbylle ti · klienti gjeti zgjidhje";
    if (l.closedBy === "customer") return "Klienti e mbylli · e gjeti produktin";
    return "Mbyllur · klienti e gjeti te një dyqan tjetër";
  };

  return (
    <div className="ld-root">
      <div>
        <h1 className="ld-title">Kërkesat e klientëve</h1>
        <p className="ld-sub">
          {active.length === 0 ? "S'ka kërkesa aktive tani." : `${active.length} aktive · ${fresh} të reja`}
          {plan.id === "plus" && " · Me Premium i merr kërkesat menjëherë, jo pas 2 orësh."}
        </p>
      </div>
      {error && <div className="ld-error">{error}</div>}

      {active.length === 0 && !error && (
        <div className="ld-empty">
          Kur një klient në qytetin tënd kërkon një produkt nga kategoritë e tua që nuk e ka asnjë dyqan, kërkesa do të dalë këtu.
          Kërkesat qëndrojnë aktive {EXPIRY_DAYS.product} ditë.
          <br />Këshillë: sa më shumë produkte të shtosh, aq më shumë klientë të gjejnë direkt.
        </div>
      )}

      <div className="ld-list">
        {active.map(l => {
          const wa = whatsappLink(l.phone,
            `Përshëndetje ${l.name}, ju shkruaj nga ${bizName}. Pamë kërkesën tuaj në NearBuy për "${l.productName}".`);
          const others = Math.max(0, (l.contactedCount || 0) - (l.status === "contacted" ? 1 : 0));
          return (
            <div key={l.id} className={`ld-card ${l.status === "new" ? "new" : ""}`}>
              <div className="ld-card-top">
                <Link href={`/products/${l.productId}`} target="_blank" className="ld-product">{l.productName}</Link>
                <span className="ld-time">{l.status === "new" && <span className="ld-badge">E re</span>} {timeAgo(l.createdAt?.seconds)}</span>
              </div>
              <p className="ld-who"><b>{l.name}</b> · {l.city} · {l.phone}</p>
              {l.note && <p className="ld-note">"{l.note}"</p>}
              {others > 0 && (
                <p className={`ld-others ${others >= CONTACTED_WARNING ? "warn" : ""}`}>
                  {others >= CONTACTED_WARNING ? "⚠️ " : "ℹ️ "}
                  {others === 1 ? "1 dyqan tjetër e ka kontaktuar tashmë" : `${others} dyqane të tjera e kanë kontaktuar tashmë`}
                  {others >= CONTACTED_WARNING && " — klienti mund ta ketë gjetur"}
                </p>
              )}
              <div className="ld-actions">
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="ld-wa" onClick={() => markContacted(l)}>💬 WhatsApp</a>}
                <a href={`tel:${l.phone}`} className="ld-call" onClick={() => markContacted(l)}>📞 Telefono</a>
                {l.status === "new"
                  ? <button className="ld-mark" onClick={() => markContacted(l)}>✓ E kontaktova</button>
                  : <>
                      <span className="ld-done">✓ Kontaktuar</span>
                      <button className="ld-mark" disabled={busyId === l.id} onClick={() => markSolved(l)}>
                        {busyId === l.id ? "Duke ruajtur..." : "Klienti gjeti zgjidhje"}
                      </button>
                    </>}
              </div>
            </div>
          );
        })}
      </div>

      {past.length > 0 && (
        <details className="ld-past">
          <summary>Të mbyllura dhe të skaduara ({past.length})</summary>
          <div className="ld-past-list">
            {past.map(l => (
              <div key={l.id} className="ld-past-row">
                <span className="ld-past-name">{l.productName} · {l.name}</span>
                <span className="ld-past-why">{pastReason(l)} · {timeAgo(l.createdAt?.seconds)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  .ld-loading{color:#71717a;padding:3rem;text-align:center}
  .ld-root{display:flex;flex-direction:column;gap:1rem;max-width:760px}
  .ld-title{font-size:1.3rem;font-weight:700;color:#f4f4f5}
  .ld-sub{font-size:0.84rem;color:#71717a;margin-top:2px}
  .ld-error{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:10px;padding:0.65rem 1rem;font-size:0.85rem}
  .ld-empty{background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.1);border-radius:14px;padding:1.5rem;color:#a1a1aa;font-size:0.88rem;line-height:1.6}
  .ld-locked{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:2rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
  .ld-lock-icon{font-size:2rem}
  .ld-lock-title{font-size:1.05rem;font-weight:700;color:#f4f4f5}
  .ld-lock-text{font-size:0.88rem;color:#a1a1aa;line-height:1.6;max-width:520px}
  .ld-lock-text b{color:#f5c842}
  .ld-btn{margin-top:6px;padding:0.65rem 1.3rem;background:#f97316;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.88rem}
  .ld-list{display:flex;flex-direction:column;gap:10px}
  .ld-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1rem 1.1rem;display:flex;flex-direction:column;gap:8px}
  .ld-card.new{border-color:rgba(245,200,66,0.35);background:rgba(245,200,66,0.04)}
  .ld-card-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
  .ld-product{font-size:0.95rem;font-weight:700;color:#f4f4f5;text-decoration:none}
  .ld-product:hover{color:#f97316}
  .ld-time{font-size:0.75rem;color:#71717a;display:flex;align-items:center;gap:6px}
  .ld-badge{background:#f5c842;color:#111;font-weight:700;font-size:0.68rem;padding:1px 7px;border-radius:999px}
  .ld-who{font-size:0.86rem;color:#d4d4d8}
  .ld-who b{color:#fff}
  .ld-note{font-size:0.84rem;color:#a1a1aa;font-style:italic}
  .ld-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .ld-wa{padding:0.5rem 0.9rem;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-size:0.82rem;font-weight:700}
  .ld-call{padding:0.5rem 0.9rem;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-size:0.82rem;font-weight:700}
  .ld-mark{padding:0.5rem 0.9rem;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#a1a1aa;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:inherit}
  .ld-done{font-size:0.8rem;color:#22c55e}
  .ld-mark:disabled{opacity:0.6}
  .ld-others{font-size:0.8rem;color:#a1a1aa}
  .ld-others.warn{color:#fbbf24}
  .ld-past{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:0.75rem 1rem}
  .ld-past summary{cursor:pointer;font-size:0.85rem;color:#a1a1aa;font-weight:600}
  .ld-past-list{display:flex;flex-direction:column;gap:6px;margin-top:10px}
  .ld-past-row{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:0.8rem;padding:6px 0;border-top:1px solid rgba(255,255,255,0.05)}
  .ld-past-name{color:#d4d4d8}
  .ld-past-why{color:#71717a}
`;
