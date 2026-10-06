"use client";

// Kërkesat që lënë klientët: produkte pa dyqan + punë për mjeshtër.
// Këtu sheh çfarë kërkohet, ku, dhe kujt nuk i ka shkuar asnjë partner.

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { whatsappLink } from "@/lib/businessInfo";
import Link from "next/link";

interface Req {
  id: string;
  kind: "product" | "job";
  what: string;        // emri i produktit ose profesioni
  detail?: string;     // shënimi ose përshkrimi i punës
  category: string;    // kategoria ose profesioni
  city: string;
  name: string;
  phone: string;
  urgency?: string;
  productId?: string;
  sentTo?: number;
  status: string;
  contactedCount?: number;
  closedBy?: string;
  createdAt?: { seconds: number };
}

const fmt = (s?: number) => (s ? new Date(s * 1000).toLocaleString("sq-AL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export default function CustomerRequestsPage() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "product" | "job">("all");
  const [onlyUnserved, setOnlyUnserved] = useState(false);
  const [city, setCity] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [cr, jr] = await Promise.all([
          getDocs(query(collection(db, "customer_requests"), orderBy("createdAt", "desc"), limit(200))),
          getDocs(query(collection(db, "job_requests"), orderBy("createdAt", "desc"), limit(200))),
        ]);
        const products: Req[] = cr.docs.map(d => {
          const x = d.data();
          return { id: d.id, kind: "product", what: x.productName, detail: x.note, category: x.category, city: x.city, name: x.name, phone: x.phone, productId: x.productId, sentTo: x.sentTo, status: x.status, createdAt: x.createdAt, contactedCount: x.contactedCount, closedBy: x.closedBy };
        });
        const jobs: Req[] = jr.docs.map(d => {
          const x = d.data();
          return { id: d.id, kind: "job", what: x.profession, detail: x.description, category: x.profession, city: x.city, name: x.name, phone: x.phone, urgency: x.urgency, sentTo: x.sentTo, status: x.status, createdAt: x.createdAt, contactedCount: x.contactedCount, closedBy: x.closedBy };
        });
        setItems([...products, ...jobs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const markHandled = async (r: Req) => {
    await updateDoc(doc(db, r.kind === "product" ? "customer_requests" : "job_requests", r.id), { status: "handled" });
    setItems(prev => prev.map(x => (x.id === r.id && x.kind === r.kind ? { ...x, status: "handled" } : x)));
  };

  const cities = useMemo(() => Array.from(new Set(items.map(i => i.city))).sort(), [items]);
  const list = items.filter(i =>
    (tab === "all" || i.kind === tab) && (!onlyUnserved || !i.sentTo) && (!city || i.city === city));

  // Ku ka kërkesë pa partner — mundësitë e shitjes
  const gaps = useMemo(() => {
    const m: Record<string, { city: string; category: string; kind: string; n: number }> = {};
    items.filter(i => !i.sentTo).forEach(i => {
      const k = `${i.kind}|${i.city}|${i.category}`;
      m[k] = m[k] || { city: i.city, category: i.category, kind: i.kind, n: 0 };
      m[k].n++;
    });
    return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 8);
  }, [items]);

  return (
    <div>
      <div className="cr-header">
        <h1>Kërkesat e klientëve</h1>
        <p>{items.filter(i => i.kind === "product").length} për produkte · {items.filter(i => i.kind === "job").length} për mjeshtër · {items.filter(i => !i.sentTo).length} pa asnjë partner</p>
      </div>

      {gaps.length > 0 && (
        <div className="cr-card">
          <p className="cr-card-title">🎯 Ku mungojnë partnerët (mundësi shitjeje)</p>
          <div className="cr-gaps">
            {gaps.map(g => (
              <span key={`${g.kind}${g.city}${g.category}`} className="cr-gap">
                <b>{g.n}</b> · {g.kind === "job" ? "🛠" : "📦"} {g.category} në {g.city}
              </span>
            ))}
          </div>
          <p className="cr-hint">Këtyre klientëve nuk u shkoi asnjë dyqan ose mjeshtër me paketë. Gjej partnerë në këto zona, ose kontakto vetë klientin.</p>
        </div>
      )}

      <div className="cr-filters">
        {(["all", "product", "job"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`cr-tab ${tab === t ? "on" : ""}`}>
            {t === "all" ? "Të gjitha" : t === "product" ? "📦 Produkte" : "🛠 Mjeshtër"}
          </button>
        ))}
        <label className="cr-check"><input type="checkbox" checked={onlyUnserved} onChange={e => setOnlyUnserved(e.target.checked)} /> Vetëm pa partner</label>
        <select value={city} onChange={e => setCity(e.target.value)} className="cr-sel">
          <option value="">Të gjitha qytetet</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <p className="cr-muted">Duke ngarkuar...</p> : list.length === 0 ? (
        <p className="cr-muted">Ende s'ka kërkesa.</p>
      ) : (
        <div className="cr-list">
          {list.map(r => {
            const wa = whatsappLink(r.phone, r.kind === "product"
              ? `Përshëndetje ${r.name}, ju shkruaj nga NearBuy.al për kërkesën tuaj për "${r.what}".`
              : `Përshëndetje ${r.name}, ju shkruaj nga NearBuy.al për kërkesën tuaj për ${r.what.toLowerCase()} në ${r.city}.`);
            return (
              <div key={`${r.kind}-${r.id}`} className={`cr-row ${r.status === "handled" || r.status === "closed" ? "done" : ""}`}>
                <div className="cr-main">
                  <p className="cr-what">
                    {r.kind === "job" ? "🛠" : "📦"}{" "}
                    {r.kind === "product" && r.productId ? <Link href={`/products/${r.productId}`} target="_blank">{r.what}</Link> : r.what}
                    {r.urgency && <span className="cr-urg">{r.urgency}</span>}
                  </p>
                  {r.detail && <p className="cr-detail">"{r.detail}"</p>}
                  <p className="cr-meta">{r.name} · {r.phone} · {r.city} · {fmt(r.createdAt?.seconds)}</p>
                </div>
                <div className="cr-side">
                  {r.sentTo ? <span className="cr-ok">→ {r.sentTo} partner{r.sentTo > 1 ? "ë" : ""}</span> : <span className="cr-bad">Pa partner</span>}
                  {!!r.contactedCount && <span className="cr-ok">📞 {r.contactedCount} e kontaktuan</span>}
                  {r.status === "closed" && <span className="cr-closed">🔒 {r.closedBy === "customer" ? "Mbyllur nga klienti" : "Mbyllur nga partneri"}</span>}
                  <div className="cr-actions">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="cr-wa">💬</a>}
                    {r.status !== "handled" && r.status !== "closed"
                      ? <button className="cr-mark" onClick={() => markHandled(r)}>✓ Trajtuar</button>
                      : <span className="cr-done">✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .cr-header{margin-bottom:1.25rem}
        .cr-closed{font-size:0.75rem;color:#71717a}
        .cr-header h1{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:0.25rem}
        .cr-header p{font-size:0.85rem;color:#71717a}
        .cr-card{background:#141414;border:1px solid rgba(249,115,22,0.25);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;display:flex;flex-direction:column;gap:10px}
        .cr-card-title{font-size:0.9rem;font-weight:700;color:#f97316}
        .cr-gaps{display:flex;flex-wrap:wrap;gap:6px}
        .cr-gap{font-size:0.8rem;color:#e4e4e7;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:999px;padding:4px 12px}
        .cr-gap b{color:#f97316}
        .cr-hint,.cr-muted{font-size:0.8rem;color:#71717a}
        .cr-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:1rem}
        .cr-tab{padding:0.45rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.82rem;cursor:pointer;font-family:inherit}
        .cr-tab.on{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .cr-check{display:flex;gap:6px;align-items:center;font-size:0.82rem;color:#a1a1aa;cursor:pointer}
        .cr-sel{background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e4e4e7;font-size:0.82rem;padding:0.4rem 0.6rem;font-family:inherit}
        .cr-list{display:flex;flex-direction:column;gap:8px}
        .cr-row{display:flex;justify-content:space-between;gap:12px;background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:0.85rem 1rem}
        .cr-row.done{opacity:0.5}
        .cr-main{min-width:0;display:flex;flex-direction:column;gap:4px}
        .cr-what{font-size:0.9rem;font-weight:700;color:#f4f4f5}
        .cr-what a{color:#f4f4f5}
        .cr-urg{margin-left:8px;font-size:0.7rem;font-weight:700;color:#f5c842}
        .cr-detail{font-size:0.84rem;color:#d4d4d8;font-style:italic}
        .cr-meta{font-size:0.76rem;color:#71717a}
        .cr-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .cr-ok{font-size:0.75rem;color:#22c55e;font-weight:600}
        .cr-bad{font-size:0.75rem;color:#f87171;font-weight:700}
        .cr-actions{display:flex;gap:6px;align-items:center}
        .cr-wa{padding:4px 10px;background:#16a34a;border-radius:6px;text-decoration:none}
        .cr-mark{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#a1a1aa;font-size:0.75rem;cursor:pointer;font-family:inherit}
        .cr-done{color:#22c55e}
      `}</style>
    </div>
  );
}
