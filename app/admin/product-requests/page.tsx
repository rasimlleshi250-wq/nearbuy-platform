"use client";

// Kërkesat e bizneseve për produkte që nuk janë në katalog.
// Prano  -> krijon produktin në katalog + e lidh me çdo biznes që e kërkoi
// Lidh   -> e lidh kërkesën me një produkt që e kemi tashmë (me emër tjetër)
// Refuzo -> kërkesa mbyllet

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
  collection, query, where, getDocs, doc, addDoc, setDoc, updateDoc, limit, serverTimestamp,
} from "firebase/firestore";
import { getCategories, getSubcategories } from "@/lib/firebase/firestore";
import { buildSearchKeywords, searchWords, pickMainTerm, matchesAllWords } from "@/lib/searchKeywords";
import { extractWords } from "@/lib/productMatcher";
import Link from "next/link";
import { notify } from "@/lib/notify";

interface Req {
  id: string;
  businessId: string;
  businessName?: string;
  name: string;
  brand?: string;
  barcode?: string;
  price?: number;
  inStock?: boolean;
  status: string;
}
interface Group { key: string; requests: Req[] }
interface Found { id: string; name: string; image?: string; category?: string }

const TAG: Record<string, string> = {
  "Hidraulikë": "hidraulike", "Elektrik": "elektrik", "Ndërtim": "ndertim",
  "Bojëra & Kimikate": "bojera__kimikate", "Kopshtari": "kopshtari",
};

export default function ProductRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "product_requests"), where("status", "==", "pending")));
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Req)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    getCategories().then(cs => setCategories(cs.map(c => c.name)));
  }, []);

  // Kërkesat me të njëjtin emër nga biznese të ndryshme bashkohen në një kartë
  const groups = useMemo<Group[]>(() => {
    const m = new Map<string, Req[]>();
    requests.forEach(r => {
      const k = extractWords(r.name).join(" ") || r.name.toLowerCase();
      m.set(k, [...(m.get(k) || []), r]);
    });
    return Array.from(m.entries())
      .map(([key, reqs]) => ({ key, requests: reqs }))
      .sort((a, b) => b.requests.length - a.requests.length);
  }, [requests]);

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3500); };

  // Lidh çdo biznes të grupit me produktin dhe mbyll kërkesat
  const linkAndClose = async (g: Group, productId: string, status: "approved" | "merged") => {
    for (const r of g.requests) {
      await setDoc(doc(db, "business_products", `${r.businessId}_${productId}`), {
        businessId: r.businessId, productId, price: r.price ?? 0, inStock: r.inStock ?? true,
        featured: false, offerPrice: null, offerEnd: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true });
      await updateDoc(doc(db, "product_requests", r.id), { status, productId, processedAt: serverTimestamp() });
      notify("product_request_done", r.id);
    }
    setRequests(prev => prev.filter(r => !g.requests.some(x => x.id === r.id)));
  };

  const approve = async (g: Group, name: string, category: string, subcategory: string, brand: string) => {
    const first = g.requests[0];
    const ref = await addDoc(collection(db, "products"), {
      name: name.trim(),
      description: "",
      category, subcategory,
      brand: brand.trim(),
      barcode: (first.barcode || "").trim(),
      tags: TAG[category] ? [TAG[category]] : [],
      images: [],
      status: "active",
      searchKeywords: buildSearchKeywords(name, brand),
      createdBy: user?.uid || "admin",
      createdAt: serverTimestamp(),
      source: "kerkese-biznesi",
    });
    await linkAndClose(g, ref.id, "approved");
    flash(`"${name}" u shtua në katalog dhe u lidh me ${g.requests.length} biznes(e).`);
  };

  const reject = async (g: Group) => {
    if (!confirm(`Refuzo "${g.requests[0].name}"?`)) return;
    for (const r of g.requests) {
      await updateDoc(doc(db, "product_requests", r.id), { status: "rejected", processedAt: serverTimestamp() });
      notify("product_request_done", r.id);
    }
    setRequests(prev => prev.filter(r => !g.requests.some(x => x.id === r.id)));
    flash("Kërkesa u refuzua.");
  };

  return (
    <div>
      <div className="rq-header">
        <h1>Kërkesat për produkte</h1>
        <p>{loading ? "Duke ngarkuar..." : `${groups.length} produkte të kërkuara · ${requests.length} kërkesa nga bizneset`}</p>
      </div>
      {message && <div className="rq-ok">✓ {message}</div>}

      {!loading && groups.length === 0 && (
        <div className="rq-empty">🎉 Nuk ka kërkesa në pritje.</div>
      )}

      <div className="rq-list">
        {groups.map(g => (
          <RequestCard key={g.key} group={g} categories={categories}
            onApprove={approve} onReject={reject}
            onLink={async (g2, p) => { await linkAndClose(g2, p.id, "merged"); flash(`U lidh me "${p.name}".`); }} />
        ))}
      </div>

      <style>{`
        .rq-header{margin-bottom:1.25rem}
        .rq-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .rq-header p{font-size:0.85rem;color:#71717a}
        .rq-ok{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);color:#22c55e;font-size:0.85rem;border-radius:10px;padding:0.65rem 1rem;margin-bottom:1rem}
        .rq-empty{text-align:center;padding:3rem;color:#71717a;background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px}
        .rq-list{display:flex;flex-direction:column;gap:12px}
        .rq-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.1rem;display:flex;flex-direction:column;gap:12px}
        .rq-top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .rq-name{font-size:0.95rem;font-weight:700;color:#e4e4e7}
        .rq-meta{font-size:0.78rem;color:#71717a;margin-top:3px}
        .rq-count{font-size:0.72rem;font-weight:700;background:rgba(249,115,22,0.12);color:#f97316;border-radius:999px;padding:3px 10px;height:fit-content;white-space:nowrap}
        .rq-biz{display:flex;flex-wrap:wrap;gap:6px}
        .rq-biz span{font-size:0.72rem;color:#a1a1aa;background:rgba(255,255,255,0.05);border-radius:6px;padding:2px 8px}
        .rq-modes{display:flex;gap:6px}
        .rq-mode{padding:0.4rem 0.9rem;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.8rem;cursor:pointer;font-family:inherit}
        .rq-mode.on{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .rq-form{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;align-items:end}
        .rq-field{display:flex;flex-direction:column;gap:4px}
        .rq-field label{font-size:0.7rem;color:#71717a;font-weight:600;text-transform:uppercase;letter-spacing:0.03em}
        .rq-field input,.rq-field select{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f4f4f5;font-size:0.85rem;padding:0.55rem 0.7rem;outline:none;font-family:inherit}
        .rq-field select option{background:#1c1c1c}
        .rq-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
        .rq-btn{padding:0.55rem 1.1rem;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit}
        .rq-btn:disabled{opacity:0.5;cursor:not-allowed}
        .rq-btn-no{padding:0.55rem 1.1rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:8px;font-size:0.82rem;cursor:pointer;font-family:inherit}
        .rq-results{display:flex;flex-direction:column;gap:4px}
        .rq-res{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0.45rem 0.6rem;border-radius:8px;background:rgba(255,255,255,0.03)}
        .rq-res-left{display:flex;align-items:center;gap:8px;min-width:0}
        .rq-res-img{width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,0.05);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .rq-res-img img{width:100%;height:100%;object-fit:cover}
        .rq-res-name{font-size:0.82rem;color:#d4d4d8}
        .rq-res-cat{font-size:0.72rem;color:#71717a}
        .rq-hint{font-size:0.75rem;color:#71717a}
        .rq-hint a{color:#f97316}
        @media(max-width:800px){.rq-form{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  );
}

function RequestCard({ group, categories, onApprove, onReject, onLink }: {
  group: Group;
  categories: string[];
  onApprove: (g: Group, name: string, category: string, subcategory: string, brand: string) => Promise<void>;
  onReject: (g: Group) => Promise<void>;
  onLink: (g: Group, p: Found) => Promise<void>;
}) {
  const first = group.requests[0];
  const [mode, setMode] = useState<"new" | "link">("new");
  const [name, setName] = useState(first.name);
  const [brand, setBrand] = useState(first.brand || "");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [subs, setSubs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(first.name);
  const [found, setFound] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSubcategory("");
    if (!category) { setSubs([]); return; }
    getSubcategories(category).then(s => setSubs(s.map(x => x.name)));
  }, [category]);

  const runSearch = async () => {
    const words = searchWords(search);
    const main = pickMainTerm(words);
    if (!main) return;
    setSearching(true);
    try {
      const snap = await getDocs(query(collection(db, "products"), where("searchKeywords", "array-contains", main), limit(60)));
      const list = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as { name: string; images?: string[]; category?: string; status?: string }) }))
        .filter(p => (p.status || "active") === "active")
        .filter(p => words.length < 2 || matchesAllWords(p.name, words.slice(0, 2)))
        .slice(0, 8)
        .map(p => ({ id: p.id, name: p.name, image: p.images?.[0], category: p.category }));
      setFound(list);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } finally { setBusy(false); } };
  const prices = group.requests.map(r => r.price).filter((p): p is number => typeof p === "number");

  return (
    <div className="rq-card">
      <div className="rq-top">
        <div>
          <p className="rq-name">{first.name}</p>
          <p className="rq-meta">
            {first.brand && <>Marka: {first.brand} · </>}
            {first.barcode && <>Barkodi: {first.barcode} · </>}
            {prices.length > 0 && <>Çmimi: {Math.min(...prices).toLocaleString()}{prices.length > 1 && Math.max(...prices) !== Math.min(...prices) ? `–${Math.max(...prices).toLocaleString()}` : ""} L</>}
          </p>
        </div>
        <span className="rq-count">{group.requests.length} biznes{group.requests.length > 1 ? "e" : ""}</span>
      </div>
      <div className="rq-biz">
        {group.requests.map(r => <span key={r.id}>{r.businessName || r.businessId.slice(0, 8)}</span>)}
      </div>

      <div className="rq-modes">
        <button className={`rq-mode ${mode === "new" ? "on" : ""}`} onClick={() => setMode("new")}>➕ Shto si produkt të ri</button>
        <button className={`rq-mode ${mode === "link" ? "on" : ""}`} onClick={() => setMode("link")}>🔗 E kemi me emër tjetër</button>
      </div>

      {mode === "new" ? (
        <>
          <div className="rq-form">
            <div className="rq-field"><label>Emri në katalog</label><input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="rq-field"><label>Marka</label><input value={brand} onChange={e => setBrand(e.target.value)} /></div>
            <div className="rq-field"><label>Kategoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Zgjidh...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="rq-field"><label>Nënkategoria</label>
              <select value={subcategory} onChange={e => setSubcategory(e.target.value)} disabled={!category}>
                <option value="">Zgjidh...</option>
                {subs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <p className="rq-hint">Produkti krijohet pa foto. Foton mund ta shtosh më pas te <Link href="/admin/products">Produktet</Link> → Edito.</p>
          <div className="rq-actions">
            <button className="rq-btn-no" disabled={busy} onClick={() => run(() => onReject(group))}>Refuzo</button>
            <button className="rq-btn" disabled={busy || !name.trim() || !category || !subcategory}
              onClick={() => run(() => onApprove(group, name, category, subcategory, brand))}>
              {busy ? "Duke ruajtur..." : "✓ Prano dhe shto në katalog"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rq-form" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="rq-field"><label>Kërko në katalog</label>
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
            </div>
            <button className="rq-btn" onClick={runSearch} disabled={searching}>{searching ? "..." : "Kërko"}</button>
          </div>
          <div className="rq-results">
            {found.map(p => (
              <div key={p.id} className="rq-res">
                <div className="rq-res-left">
                  <span className="rq-res-img">{p.image ? <img src={p.image} alt="" /> : "📦"}</span>
                  <span><span className="rq-res-name">{p.name}</span><br /><span className="rq-res-cat">{p.category}</span></span>
                </div>
                <button className="rq-btn" disabled={busy} onClick={() => run(() => onLink(group, p))}>Lidhe</button>
              </div>
            ))}
            {!searching && found.length === 0 && <p className="rq-hint">Shkruaj një emër dhe kliko Kërko.</p>}
          </div>
        </>
      )}
    </div>
  );
}
