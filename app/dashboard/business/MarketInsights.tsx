"use client";

// "Çfarë kërkojnë klientët" — statistikat që i tregojnë dyqanit çfarë të mbajë dhe ku të bëjë ofertë.
//
//  1. Më të kërkuarat këtë javë   (gjithë NearBuy, në kategoritë e dyqanit)      → Plus / Premium
//  2. Ku të bësh ofertë            (produktet e tua: shikime, kontakte, çmimi)   → Plus / Premium
//  3. Kërkuan, askush s'e kishte   (kërkesat e klientëve pa dyqan, në qytet)     → Plus / Premium
//  4. Produktet e tua              (shikime → kontakte, këtë javë / 4 javë)      → Bazë e lart
//
// Mbushen vetë me kalimin e kohës. Kur s'ka ende të dhëna, shfaqet "Po mbledhim të dhëna".

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { lastWeeks, monthId, prevMonthId, unmetKey, plural } from "@/lib/periods";

type Level = "none" | "own" | "market";

interface Props {
  businessId: string;
  city: string;
  categories: string[];
  myProductIds: string[];
  level: Level; // none = Falas, own = Bazë, market = Plus/Premium
}

interface OwnRow { productId: string; name: string; viewsW: number; views4: number; contactsW: number; contacts4: number; }
interface TopRow { productId: string; name: string; count: number; prev: number; mine: boolean; }
interface UnmetRow { productId: string; name: string; count: number; mine: boolean; }
interface MarketRow { productId: string; name: string; category: string; count: number; }
interface OfferRow { productId: string; name: string; views: number; contacts: number; myPrice: number; cheaper: number; minOther: number | null; }

const lek = (n: number) => `${Math.round(n).toLocaleString()} L`;

function effectivePrice(d: Record<string, unknown>): number {
  const price = Number(d.price) || 0;
  const offer = Number(d.offerPrice) || 0;
  const end = typeof d.offerEnd === "string" && d.offerEnd ? new Date(d.offerEnd + "T23:59:59").getTime() : Infinity;
  return offer > 0 && offer < price && end >= Date.now() ? offer : price;
}

export default function MarketInsights({ businessId, city, categories, myProductIds, level }: Props) {
  const [loading, setLoading] = useState(level !== "none");
  const [own, setOwn] = useState<OwnRow[]>([]);
  const [top, setTop] = useState<TopRow[]>([]);
  const [topLabel, setTopLabel] = useState("këtë javë");
  const [unmet, setUnmet] = useState<UnmetRow[]>([]);
  const [unmetLabel, setUnmetLabel] = useState("këtë muaj");
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [range, setRange] = useState<"week" | "month">("month");

  const mine = useMemo(() => new Set(myProductIds), [myProductIds]);
  const catKey = categories.join("|");

  useEffect(() => {
    if (level === "none" || !businessId) return;
    let alive = true;
    const cats = new Set(catKey ? catKey.split("|") : []);
    // Kategoritë e dyqanit; nëse s'mbetet asgjë pas filtrit, tregojmë gjithçka
    const byCategory = (rows: MarketRow[]): MarketRow[] => {
      const f = cats.size ? rows.filter(r => r.category && cats.has(r.category)) : rows;
      return f.length ? f : rows;
    };

    const load = async () => {
      const weeks = lastWeeks(4);
      const week = weeks[0];

      // ── 4. Produktet e tua ──────────────────────────────
      const [pv, pc] = await Promise.all([
        getDocs(query(collection(db, "analytics_businesses", businessId, "pviews"), where("week", "in", weeks))),
        getDocs(query(collection(db, "analytics_businesses", businessId, "pcontacts"), where("week", "in", weeks))),
      ]);
      const map = new Map<string, OwnRow>();
      const row = (id: string, name: string) => {
        if (!map.has(id)) map.set(id, { productId: id, name, viewsW: 0, views4: 0, contactsW: 0, contacts4: 0 });
        return map.get(id)!;
      };
      pv.docs.forEach(d => {
        const x = d.data(); const r = row(String(x.productId), String(x.name || ""));
        r.views4 += Number(x.count) || 0; if (x.week === week) r.viewsW += Number(x.count) || 0;
      });
      pc.docs.forEach(d => {
        const x = d.data(); const r = row(String(x.productId), String(x.name || ""));
        r.contacts4 += Number(x.count) || 0; if (x.week === week) r.contactsW += Number(x.count) || 0;
      });
      const ownRows = [...map.values()];
      if (!alive) return;
      setOwn(ownRows);

      if (level !== "market") return;

      // ── 1. Më të kërkuarat këtë javë ─────────────────────
      const readWeek = async (w: string): Promise<MarketRow[]> =>
        (await getDocs(query(collection(db, "market_weeks", w, "products"), orderBy("count", "desc"), limit(40))))
          .docs.map(d => ({ productId: d.id, name: String(d.data().name || ""), category: String(d.data().category || ""), count: Number(d.data().count) || 0 }));
      let weekRows = await readWeek(week);
      let shownWeek = week, prevWeek = weeks[1];
      if (!weekRows.length) { weekRows = await readWeek(weeks[1]); shownWeek = weeks[1]; prevWeek = weeks[2]; }
      const top5 = byCategory(weekRows).slice(0, 5);
      const prevCounts = await Promise.all(top5.map(r =>
        getDoc(doc(db, "market_weeks", prevWeek, "products", r.productId)).then(s => Number(s.data()?.count) || 0).catch(() => 0)));
      if (!alive) return;
      setTopLabel(shownWeek === week ? "këtë javë" : "javën e kaluar");
      setTop(top5.map((r, i) => ({ productId: r.productId, name: r.name, count: r.count, prev: prevCounts[i], mine: mine.has(r.productId) })));

      // ── 3. Kërkuan, askush s'e kishte ────────────────────
      const readUnmet = async (m: string): Promise<MarketRow[]> =>
        (await getDocs(query(collection(db, "market_unmet", unmetKey(city, m), "products"), orderBy("count", "desc"), limit(40))))
          .docs.map(d => ({ productId: d.id, name: String(d.data().name || ""), category: String(d.data().category || ""), count: Number(d.data().count) || 0 }));
      let unmetRows = city ? await readUnmet(monthId()) : [];
      let label = "këtë muaj";
      if (city && !unmetRows.length) { unmetRows = await readUnmet(prevMonthId()); label = "muajin e kaluar"; }
      if (!alive) return;
      setUnmetLabel(label);
      setUnmet(byCategory(unmetRows).slice(0, 5).map(r => ({ productId: r.productId, name: r.name, count: r.count, mine: mine.has(r.productId) })));

      // ── 2. Ku të bësh ofertë ─────────────────────────────
      const candidates = ownRows.filter(r => r.views4 >= 3).sort((a, b) => b.views4 - a.views4).slice(0, 6);
      const offerRows = await Promise.all(candidates.map(async r => {
        const snap = await getDocs(query(collection(db, "business_products"), where("productId", "==", r.productId)));
        const all = snap.docs.map(d => d.data() as Record<string, unknown>);
        const me = all.find(d => d.businessId === businessId);
        if (!me) return null;
        const myPrice = effectivePrice(me);
        const others = all.filter(d => d.businessId !== businessId && d.inStock !== false).map(effectivePrice).filter(p => p > 0);
        const cheaper = others.filter(p => p < myPrice).length;
        const lowConversion = r.views4 >= 5 && r.contacts4 / r.views4 < 0.1;
        if (!cheaper && !lowConversion) return null; // s'ka sinjal për ofertë
        return { productId: r.productId, name: r.name, views: r.views4, contacts: r.contacts4, myPrice, cheaper, minOther: others.length ? Math.min(...others) : null };
      }));
      if (!alive) return;
      setOffers(offerRows.filter((x): x is OfferRow => x !== null).slice(0, 5));
    };

    load().catch(e => console.error("MarketInsights:", e)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [businessId, city, catKey, level, mine]);

  // ── Falas: vetëm një ftesë ─────────────────────────────
  if (level === "none") {
    return (
      <>
        <div className="mi-title">Çfarë kërkojnë klientët</div>
        <div className="mi-locked">
          <span>🔒</span>
          <div>
            <p className="mi-locked-title">Shiko çfarë kërkojnë klientët dhe ku të bësh ofertë</p>
            <p className="mi-locked-sub">Produktet më të kërkuara këtë javë, produktet që klientët kërkuan por askush s'i kishte, dhe krahasimi i çmimit tënd. Me paketën Plus ose Premium.</p>
          </div>
        </div>
        <style>{css}</style>
      </>
    );
  }

  const ownSorted = [...own]
    .map(r => ({ ...r, v: range === "week" ? r.viewsW : r.views4, c: range === "week" ? r.contactsW : r.contacts4 }))
    .filter(r => r.v > 0 || r.c > 0)
    .sort((a, b) => b.c - a.c || b.v - a.v)
    .slice(0, 8);
  const collecting = <p className="mi-empty">Po mbledhim të dhëna. Mbushet vetë sapo klientët të hapin produktet.</p>;

  return (
    <>
      <div className="mi-title">Çfarë kërkojnë klientët</div>

      {level === "market" && (
        <div className="mi-grid">
          {/* 1 */}
          <div className="mi-card">
            <p className="mi-card-title">🔥 Më të kërkuarat {topLabel}</p>
            <p className="mi-card-sub">Produktet që klientët hapën më shumë në NearBuy, në kategoritë e tua</p>
            {loading ? <p className="mi-empty">Duke ngarkuar…</p> : !top.length ? collecting : (
              <div className="mi-list">
                {top.map((r, i) => {
                  const diff = r.count - r.prev;
                  return (
                    <div key={r.productId} className="mi-row">
                      <span className="mi-rank">#{i + 1}</span>
                      <Link href={`/products/${r.productId}`} target="_blank" className="mi-name">{r.name}</Link>
                      <span className="mi-num">{plural(r.count, "shikim", "shikime")}</span>
                      <span className="mi-trend" style={{ color: diff > 0 ? "#22c55e" : diff < 0 ? "#f87171" : "#71717a" }}>
                        {r.prev === 0 ? "e re" : diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : "="}
                      </span>
                      {r.mine
                        ? <span className="mi-tag mi-tag-ok">✓ E ke</span>
                        : <Link href="/dashboard/business/products" className="mi-tag mi-tag-add">+ Shtoje</Link>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2 */}
          <div className="mi-card">
            <p className="mi-card-title">💰 Ku të bësh ofertë</p>
            <p className="mi-card-sub">Produktet e tua që shihen, por çmimi ose kontaktet tregojnë se klientët shkojnë diku tjetër (4 javët e fundit)</p>
            {loading ? <p className="mi-empty">Duke ngarkuar…</p> : !offers.length ? (
              <p className="mi-empty">{own.length ? "Asnjë sinjal tani: çmimet e tua janë konkurruese. 👍" : "Po mbledhim të dhëna. Mbushet vetë sapo klientët të hapin produktet e tua."}</p>
            ) : (
              <div className="mi-list">
                {offers.map(r => (
                  <div key={r.productId} className="mi-offer">
                    <Link href={`/products/${r.productId}`} target="_blank" className="mi-name">{r.name}</Link>
                    <p className="mi-offer-line">
                      {plural(r.views, "shikim", "shikime")} → {plural(r.contacts, "kontakt", "kontakte")} · çmimi yt {lek(r.myPrice)}
                    </p>
                    <p className="mi-offer-hint">
                      {r.cheaper > 0
                        ? `${plural(r.cheaper, "dyqan tjetër e ka", "dyqane të tjera e kanë")} më lirë${r.minOther !== null ? ` (nga ${lek(r.minOther)})` : ""}. Një ofertë do të të nxirrte para tyre.`
                        : "Shumë shikime, pak kontakte. Provo një ofertë, ose përmirëso foton dhe përshkrimin."}
                    </p>
                  </div>
                ))}
                <Link href="/dashboard/business/products" className="mi-cta">Bëj ofertë te produktet →</Link>
              </div>
            )}
          </div>

          {/* 3 */}
          <div className="mi-card">
            <p className="mi-card-title">🕳️ Kërkuan, askush s&apos;e kishte</p>
            <p className="mi-card-sub">Klientë në {city || "qytetin tënd"} që kërkuan {unmetLabel} një produkt që asnjë dyqan nuk e kishte në listë</p>
            {loading ? <p className="mi-empty">Duke ngarkuar…</p> : !unmet.length ? (
              <p className="mi-empty">Asnjë kërkesë e pambuluar {unmetLabel}. Mbushet vetë kur klientët kërkojnë diçka që s&apos;e gjejnë.</p>
            ) : (
              <div className="mi-list">
                {unmet.map(r => (
                  <div key={r.productId} className="mi-row">
                    <Link href={`/products/${r.productId}`} target="_blank" className="mi-name">{r.name}</Link>
                    <span className="mi-num">{plural(r.count, "klient", "klientë")}</span>
                    {r.mine
                      ? <span className="mi-tag mi-tag-ok">✓ E ke tani</span>
                      : <Link href="/dashboard/business/products" className="mi-tag mi-tag-add">+ Shtoje</Link>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 */}
      <div className="mi-card">
        <div className="mi-card-head">
          <div>
            <p className="mi-card-title">📊 Produktet e tua</p>
            <p className="mi-card-sub">Sa herë u hap produkti yt dhe sa klientë të kontaktuan prej tij</p>
          </div>
          <div className="mi-toggle">
            <button className={range === "week" ? "on" : ""} onClick={() => setRange("week")}>Këtë javë</button>
            <button className={range === "month" ? "on" : ""} onClick={() => setRange("month")}>4 javë</button>
          </div>
        </div>
        {loading ? <p className="mi-empty">Duke ngarkuar…</p> : !ownSorted.length ? collecting : (
          <div className="mi-list">
            {ownSorted.map((r, i) => (
              <div key={r.productId} className="mi-row">
                <span className="mi-rank">#{i + 1}</span>
                <Link href={`/products/${r.productId}`} target="_blank" className="mi-name">{r.name}</Link>
                <span className="mi-num">{plural(r.v, "shikim", "shikime")}</span>
                <span className="mi-num mi-num-strong">{plural(r.c, "kontakt", "kontakte")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {level === "own" && (
        <div className="mi-locked">
          <span>🔒</span>
          <div>
            <p className="mi-locked-title">Më shumë me Plus: çfarë kërkon tregu</p>
            <p className="mi-locked-sub">Produktet më të kërkuara këtë javë, kërkesat që askush s&apos;i mbuloi, dhe ku çmimi yt është më i lartë se të tjerët.</p>
          </div>
        </div>
      )}

      <style>{css}</style>
    </>
  );
}

const css = `
  .mi-title{font-size:0.75rem;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.05em}
  .mi-grid{display:grid;grid-template-columns:1fr;gap:12px}
  .mi-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:1rem;display:flex;flex-direction:column;gap:0.6rem}
  .mi-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
  .mi-card-title{font-size:0.9rem;font-weight:700;color:#f4f4f5}
  .mi-card-sub{font-size:0.75rem;color:#71717a;margin-top:2px;line-height:1.45}
  .mi-list{display:flex;flex-direction:column;gap:6px}
  .mi-row{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:0.6rem 0.8rem;flex-wrap:wrap}
  .mi-rank{font-size:0.8rem;font-weight:800;color:#f97316;width:24px;flex-shrink:0}
  .mi-name{font-size:0.85rem;font-weight:600;color:#e4e4e7;flex:1;min-width:120px;text-decoration:none}
  .mi-name:hover{color:#fb923c}
  .mi-num{font-size:0.75rem;color:#a1a1aa;white-space:nowrap}
  .mi-num-strong{color:#22c55e;font-weight:600}
  .mi-trend{font-size:0.72rem;font-weight:600;width:44px;text-align:right;white-space:nowrap}
  .mi-tag{font-size:0.7rem;font-weight:600;padding:3px 8px;border-radius:6px;white-space:nowrap;text-decoration:none}
  .mi-tag-ok{background:rgba(34,197,94,0.1);color:#4ade80;border:1px solid rgba(34,197,94,0.25)}
  .mi-tag-add{background:rgba(249,115,22,0.12);color:#fb923c;border:1px solid rgba(249,115,22,0.3)}
  .mi-offer{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:0.7rem 0.8rem;display:flex;flex-direction:column;gap:3px}
  .mi-offer-line{font-size:0.75rem;color:#a1a1aa}
  .mi-offer-hint{font-size:0.78rem;color:#fbbf24;line-height:1.45}
  .mi-cta{font-size:0.8rem;font-weight:600;color:#f97316;text-decoration:none;margin-top:4px}
  .mi-empty{font-size:0.8rem;color:#71717a;padding:0.4rem 0;line-height:1.5}
  .mi-toggle{display:flex;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:2px}
  .mi-toggle button{background:none;border:none;color:#a1a1aa;font-size:0.72rem;font-weight:600;padding:4px 10px;border-radius:6px;cursor:pointer;font-family:inherit}
  .mi-toggle button.on{background:rgba(249,115,22,0.15);color:#fb923c}
  .mi-locked{display:flex;gap:12px;align-items:flex-start;background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:1rem}
  .mi-locked span:first-child{font-size:1.2rem}
  .mi-locked-title{font-size:0.875rem;font-weight:600;color:#d8b4fe}
  .mi-locked-sub{font-size:0.78rem;color:#a1a1aa;margin-top:3px;line-height:1.5}
`;
