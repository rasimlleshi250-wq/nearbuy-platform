"use client";

// Ngarkimi i produkteve me Excel për bizneset.
// 1) Biznesi ngarkon Excel-in  2) lidh kolonat  3) sheh çfarë u gjet  4) ruan.
// Produktet që i kemi lidhen direkt me profilin; ato që nuk i kemi shkojnë si kërkesë te admini.

import { useMemo, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { ProductMatcher, MatchResult, parsePrice, parseStock, extractWords } from "@/lib/productMatcher";

export interface ImportCatalogItem {
  id: string;
  name: string;
  category: string;
  images?: string[];
  brand?: string;
  barcode?: string;
}

interface Props {
  businessId: string;
  businessName: string;
  catalog: ImportCatalogItem[];
  linkedProductIds: Set<string>;
  pendingRequestNames: Set<string>;
  maxNew?: number | null; // sa produkte të reja lejon paketa (null = pa limit)
  onDone: () => void;
}

type Field = "name" | "price" | "stock" | "barcode" | "brand";
const FIELD_LABELS: Record<Field, string> = {
  name: "Emri i produktit *", price: "Çmimi *", stock: "Stoku / Sasia", barcode: "Barkodi", brand: "Marka",
};
const FIELD_GUESS: Record<Field, RegExp> = {
  name: /em[eë]r|emri|produkt|artikull|artikuj|p[eë]rshkrim|name|description|item/i,
  price: /[cç]m[ie]m|price|kosto|vler/i,
  stock: /stok|sasi|gjendje|qty|quantity|stock|cope/i,
  barcode: /bar.?kod|barcode|ean|upc/i,
  brand: /mark|brand|prodhues/i,
};
const MAX_ROWS = 3000;
const PAGE = 50;

interface Row {
  idx: number;
  name: string;
  price: number | null;
  inStock: boolean;
  barcode: string;
  brand: string;
  result: MatchResult;
  choice: string; // productId | "new" | "skip" | "" (pa vendosur)
}

const nameKey = (s: string) => extractWords(s).join(" ");

export default function ExcelImport({ businessId, businessName, catalog, linkedProductIds, pendingRequestNames, maxNew = null, onDone }: Props) {
  const [step, setStep] = useState<"upload" | "map" | "review" | "done">("upload");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<Field, string>>({ name: "", price: "", stock: "", barcode: "", brand: "" });
  const [rows, setRows] = useState<Row[]>([]);
  const [view, setView] = useState<"sure" | "maybe" | "new" | "noprice">("sure");
  const [shown, setShown] = useState(PAGE);
  const [summary, setSummary] = useState({ linked: 0, updated: 0, requested: 0 });

  const byId = useMemo(() => new Map(catalog.map(c => [c.id, c] as [string, ImportCatalogItem])), [catalog]);

  // ── Shablloni ────────────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Emri i produktit", "Çmimi (Lekë)", "Stoku", "Barkodi", "Marka"],
      ["Celes fiso-stel 13 mm", 450, 12, "", ""],
      ["Silikon sanitar transparent 280 ml", 380, 40, "", ""],
      ["Pompe zhytese uji 750 W", 8900, 3, "", ""],
    ]);
    ws["!cols"] = [{ wch: 42 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produktet");
    XLSX.writeFile(wb, "NearBuy-shablloni-produkteve.xlsx");
  };

  // ── 1. Leximi i skedarit ─────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setError(""); setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (data.length === 0) { setError("Skedari është bosh ose rreshti i parë nuk ka tituj kolonash."); return; }
      if (data.length > MAX_ROWS) { setError(`Skedari ka ${data.length} rreshta. Maksimumi është ${MAX_ROWS} njëherësh — ndaje në disa skedarë.`); return; }
      const hdrs = Object.keys(data[0]);
      const guess = { name: "", price: "", stock: "", barcode: "", brand: "" } as Record<Field, string>;
      (Object.keys(FIELD_GUESS) as Field[]).forEach(f => {
        guess[f] = hdrs.find(h => FIELD_GUESS[f].test(h) && !Object.values(guess).includes(h)) || "";
      });
      setFileName(file.name); setHeaders(hdrs); setRaw(data); setMapping(guess); setStep("map");
    } catch (e) {
      console.error(e);
      setError("Skedari nuk u lexua dot. Sigurohu që është Excel (.xlsx, .xls) ose CSV.");
    } finally { setBusy(false); }
  };

  // ── 2. Krahasimi me katalogun ────────────────────────────────────────────
  const runMatching = () => {
    if (!mapping.name || !mapping.price) { setError("Zgjidh kolonën e emrit dhe të çmimit."); return; }
    setError(""); setBusy(true);
    setTimeout(() => {
      const matcher = new ProductMatcher(catalog);
      const out: Row[] = [];
      raw.forEach((r, i) => {
        const name = String(r[mapping.name] ?? "").trim();
        if (!name) return;
        const barcode = mapping.barcode ? String(r[mapping.barcode] ?? "").trim() : "";
        const brand = mapping.brand ? String(r[mapping.brand] ?? "").trim() : "";
        const result = matcher.match(name, barcode, brand);
        const price = parsePrice(r[mapping.price]);
        const inStock = mapping.stock ? parseStock(r[mapping.stock]) : true;
        let choice = result.status === "sure" ? result.candidates[0].id : result.status === "new" ? "new" : "";
        if (price === null) choice = "skip";
        out.push({ idx: i + 2, name, price, inStock, barcode, brand, result, choice });
      });
      setRows(out); setView(out.some(r => r.result.status === "sure" && r.price !== null) ? "sure" : "maybe");
      setShown(PAGE); setStep("review"); setBusy(false);
    }, 30);
  };

  const setChoice = (idx: number, choice: string) =>
    setRows(prev => prev.map(r => (r.idx === idx ? { ...r, choice } : r)));

  const groups = useMemo(() => ({
    sure: rows.filter(r => r.price !== null && r.result.status === "sure"),
    maybe: rows.filter(r => r.price !== null && r.result.status === "maybe"),
    new: rows.filter(r => r.price !== null && r.result.status === "new"),
    noprice: rows.filter(r => r.price === null),
  }), [rows]);

  const toLink = rows.filter(r => r.price !== null && r.choice && r.choice !== "new" && r.choice !== "skip");
  const toRequest = rows.filter(r => r.price !== null && r.choice === "new");
  const undecided = groups.maybe.filter(r => r.choice === "").length;

  // ── 3. Ruajtja ───────────────────────────────────────────────────────────
  const save = async () => {
    setBusy(true); setError("");
    try {
      // Nëse i njëjti produkt del dy herë në Excel, mbahet rreshti i fundit
      const links = new Map<string, Row>();
      toLink.forEach(r => links.set(r.choice, r));
      const newLinks = Array.from(links.keys()).filter(id => !linkedProductIds.has(id)).length;
      if (maxNew !== null && newLinks > maxNew) {
        setError(`Paketa jote lejon edhe ${maxNew} produkte të reja, por zgjodhe ${newLinks}. Anashkalo disa, ose kalo te një paketë më e madhe. Përditësimi i çmimeve të produkteve që ke tashmë funksionon pa limit.`);
        setBusy(false);
        return;
      }
      const requests = new Map<string, Row>();
      toRequest.forEach(r => { const k = nameKey(r.name); if (k && !pendingRequestNames.has(k)) requests.set(k, r); });

      const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
      let linked = 0, updated = 0;
      links.forEach((r, productId) => {
        const exists = linkedProductIds.has(productId);
        if (exists) updated++; else linked++;
        ops.push(b => b.set(doc(db, "business_products", `${businessId}_${productId}`), {
          businessId, productId, price: r.price, inStock: r.inStock, updatedAt: serverTimestamp(),
          ...(exists ? {} : { createdAt: serverTimestamp(), featured: false, offerPrice: null, offerEnd: null }),
        }, { merge: true }));
      });
      requests.forEach(r => {
        ops.push(b => b.set(doc(collection(db, "product_requests")), {
          businessId, businessName, name: r.name, brand: r.brand, barcode: r.barcode,
          price: r.price, inStock: r.inStock, status: "pending", createdAt: serverTimestamp(),
        }));
      });

      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach(op => op(batch));
        await batch.commit();
      }
      setSummary({ linked, updated, requested: requests.size });
      setStep("done");
      onDone();
    } catch (e) {
      console.error(e);
      setError("Ruajtja dështoi. Kontrollo lidhjen dhe provo përsëri.");
    } finally { setBusy(false); }
  };

  const reset = () => { setStep("upload"); setRows([]); setRaw([]); setHeaders([]); setError(""); };

  // ── Pamja ────────────────────────────────────────────────────────────────
  const Candidate = ({ id }: { id: string }) => {
    const c = byId.get(id);
    if (!c) return null;
    return (
      <span className="xi-cand">
        <span className="xi-cand-img">{c.images?.[0] ? <img src={c.images[0]} alt="" /> : "📦"}</span>
        <span className="xi-cand-name">{c.name}</span>
      </span>
    );
  };

  const list = groups[view];

  return (
    <div className="xi-root">
      {step === "upload" && (
        <div className="xi-card">
          <h3 className="xi-title">Ngarko produktet me Excel</h3>
          <p className="xi-text">
            Ngarko listën e produkteve që ke në dyqan. Produktet që i kemi në katalog shtohen direkt në profilin tënd
            me çmimin tënd. Ato që nuk i kemi na vijnë si kërkesë dhe i shtojmë ne.
          </p>
          <ol className="xi-steps">
            <li>Shkarko shabllonin, ose përdor Excel-in tënd. Mjafton të ketë emrin dhe çmimin.</li>
            <li>Ngarko skedarin.</li>
            <li>Kontrollo rezultatin dhe kliko <b>Ruaj</b>.</li>
          </ol>
          <div className="xi-actions">
            <button onClick={downloadTemplate} className="xi-btn-sec">⬇ Shkarko shabllonin</button>
            <label className={`xi-btn ${busy ? "xi-disabled" : ""}`}>
              {busy ? "Duke lexuar..." : "📥 Zgjidh skedarin Excel"}
              <input type="file" accept=".xlsx,.xls,.csv" hidden disabled={busy}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </label>
          </div>
          <p className="xi-hint">Kur do të ndryshosh çmimet, ngarko përsëri Excel-in. Produktet që i ke tashmë përditësohen.</p>
        </div>
      )}

      {step === "map" && (
        <div className="xi-card">
          <h3 className="xi-title">Lidh kolonat</h3>
          <p className="xi-text"><b>{fileName}</b> · {raw.length} rreshta. Trego cila kolonë e Excel-it është cila.</p>
          <div className="xi-map">
            {(Object.keys(FIELD_LABELS) as Field[]).map(f => (
              <label key={f} className="xi-map-row">
                <span>{FIELD_LABELS[f]}</span>
                <select value={mapping[f]} onChange={e => setMapping(m => ({ ...m, [f]: e.target.value }))}>
                  <option value="">— nuk e kam —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          {raw[0] && mapping.name && (
            <p className="xi-hint">Shembull nga rreshti i parë: <b>{String(raw[0][mapping.name])}</b>
              {mapping.price && <> · {String(raw[0][mapping.price])} L</>}</p>
          )}
          <div className="xi-actions">
            <button onClick={reset} className="xi-btn-sec">← Mbrapa</button>
            <button onClick={runMatching} disabled={busy} className="xi-btn">{busy ? "Duke krahasuar..." : "Vazhdo →"}</button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="xi-card">
          <h3 className="xi-title">Kontrollo rezultatin</h3>
          <div className="xi-tabs">
            <button className={`xi-tab ${view === "sure" ? "on" : ""}`} onClick={() => { setView("sure"); setShown(PAGE); }}>✅ U gjetën ({groups.sure.length})</button>
            <button className={`xi-tab ${view === "maybe" ? "on" : ""}`} onClick={() => { setView("maybe"); setShown(PAGE); }}>🟡 Ndoshta ({groups.maybe.length}){undecided > 0 && <span className="xi-badge">{undecided}</span>}</button>
            <button className={`xi-tab ${view === "new" ? "on" : ""}`} onClick={() => { setView("new"); setShown(PAGE); }}>➕ Nuk i kemi ({groups.new.length})</button>
            {groups.noprice.length > 0 && <button className={`xi-tab ${view === "noprice" ? "on" : ""}`} onClick={() => { setView("noprice"); setShown(PAGE); }}>⚠ Pa çmim ({groups.noprice.length})</button>}
          </div>

          <p className="xi-hint">
            {view === "sure" && "Këto produkte i kemi në katalog. Do të shtohen në profilin tënd me çmimin nga Excel-i. Nëse ndonjë nuk është i sakti, kliko \"Nuk është ky\"."}
            {view === "maybe" && "Për këto nuk jemi të sigurt. Zgjidh produktin e saktë, ose dërgoje si produkt të ri. Ato pa zgjedhje nuk ruhen."}
            {view === "new" && "Këto nuk i kemi në katalog. Do të na vijnë si kërkesë. Pasi t'i shtojmë, shfaqen automatikisht në profilin tënd."}
            {view === "noprice" && "Këtyre u mungon çmimi ose çmimi nuk lexohet. Nuk do të ruhen — plotëso çmimin në Excel dhe ngarkoje përsëri."}
          </p>

          <div className="xi-list">
            {list.slice(0, shown).map(r => (
              <div key={r.idx} className="xi-row">
                <div className="xi-row-head">
                  <span className="xi-row-name">{r.name}</span>
                  <span className="xi-row-meta">
                    {r.price !== null ? `${r.price.toLocaleString()} L` : "pa çmim"} · {r.inStock ? "në stok" : "jashtë stoku"} · rreshti {r.idx}
                  </span>
                </div>

                {view === "sure" && r.choice === "new" && (
                  <div className="xi-row-body">
                    <span className="xi-tag">do të dërgohet si kërkesë</span>
                    <button className="xi-link" onClick={() => setChoice(r.idx, r.result.candidates[0].id)}>Ktheje</button>
                  </div>
                )}
                {view === "sure" && r.choice !== "new" && (
                  r.choice !== "skip" ? (
                    <div className="xi-row-body">
                      <span className="xi-arrow">→</span><Candidate id={r.choice || r.result.candidates[0].id} />
                      {linkedProductIds.has(r.choice) && <span className="xi-tag">përditësim çmimi</span>}
                      <button className="xi-link" onClick={() => setChoice(r.idx, "skip")}>Nuk është ky</button>
                    </div>
                  ) : (
                    <div className="xi-row-body">
                      <span className="xi-muted">Nuk do të ruhet.</span>
                      <button className="xi-link" onClick={() => setChoice(r.idx, r.result.candidates[0].id)}>Ktheje</button>
                      <button className="xi-link" onClick={() => setChoice(r.idx, "new")}>Dërgoje si produkt të ri</button>
                    </div>
                  )
                )}

                {view === "maybe" && (
                  <div className="xi-options">
                    {r.result.candidates.map(c => (
                      <label key={c.id} className={`xi-opt ${r.choice === c.id ? "on" : ""}`}>
                        <input type="radio" name={`r${r.idx}`} checked={r.choice === c.id} onChange={() => setChoice(r.idx, c.id)} />
                        <Candidate id={c.id} />
                      </label>
                    ))}
                    <label className={`xi-opt ${r.choice === "new" ? "on" : ""}`}>
                      <input type="radio" name={`r${r.idx}`} checked={r.choice === "new"} onChange={() => setChoice(r.idx, "new")} />
                      <span>➕ Asnjëri — dërgoje si produkt të ri</span>
                    </label>
                    <label className={`xi-opt ${r.choice === "skip" ? "on" : ""}`}>
                      <input type="radio" name={`r${r.idx}`} checked={r.choice === "skip"} onChange={() => setChoice(r.idx, "skip")} />
                      <span>Anashkaloje</span>
                    </label>
                  </div>
                )}

                {view === "new" && (
                  <div className="xi-row-body">
                    {r.choice === "new"
                      ? <><span className="xi-tag">do të dërgohet si kërkesë</span><button className="xi-link" onClick={() => setChoice(r.idx, "skip")}>Mos e dërgo</button></>
                      : <><span className="xi-muted">Nuk do të dërgohet.</span><button className="xi-link" onClick={() => setChoice(r.idx, "new")}>Dërgoje</button></>}
                  </div>
                )}
              </div>
            ))}
            {list.length === 0 && <p className="xi-muted xi-center">Asgjë këtu.</p>}
            {list.length > shown && <button className="xi-btn-sec xi-more" onClick={() => setShown(s => s + PAGE)}>Shfaq edhe {Math.min(PAGE, list.length - shown)}</button>}
          </div>

          <div className="xi-footer">
            <p className="xi-total">
              Do të shtohen/përditësohen <b>{toLink.length}</b> produkte · do të dërgohen <b>{toRequest.length}</b> kërkesa
              {undecided > 0 && <> · <span className="xi-warn">{undecided} pa zgjedhur te "Ndoshta"</span></>}
            </p>
            <div className="xi-actions">
              <button onClick={reset} className="xi-btn-sec">Anulo</button>
              <button onClick={save} disabled={busy || (toLink.length === 0 && toRequest.length === 0)} className="xi-btn">
                {busy ? "Duke ruajtur..." : "✓ Ruaj"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="xi-card xi-center">
          <p className="xi-done-icon">✅</p>
          <h3 className="xi-title">U ruajt!</h3>
          <p className="xi-text">
            {summary.linked} produkte të reja në profilin tënd · {summary.updated} çmime të përditësuara · {summary.requested} kërkesa për produkte të reja.
          </p>
          {summary.requested > 0 && <p className="xi-hint">Kërkesat i shikon më poshtë te "Kërkesat e mia". Do të të shfaqen në profil sapo t'i shtojmë.</p>}
          <div className="xi-actions xi-center-row"><button onClick={reset} className="xi-btn-sec">Ngarko një skedar tjetër</button></div>
        </div>
      )}

      {error && <div className="xi-error">{error}</div>}

      <style>{`
        .xi-root{display:flex;flex-direction:column;gap:12px}
        .xi-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:12px}
        .xi-title{font-size:1rem;font-weight:700;color:#f4f4f5}
        .xi-text{font-size:0.85rem;color:#a1a1aa;line-height:1.55}
        .xi-text b{color:#e4e4e7}
        .xi-steps{font-size:0.85rem;color:#a1a1aa;line-height:1.7;padding-left:1.2rem}
        .xi-hint{font-size:0.78rem;color:#71717a;line-height:1.5}
        .xi-hint b{color:#a1a1aa}
        .xi-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .xi-btn{display:inline-flex;align-items:center;gap:6px;padding:0.6rem 1.2rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:inherit}
        .xi-btn:disabled,.xi-disabled{opacity:0.55;cursor:not-allowed}
        .xi-btn-sec{padding:0.6rem 1.2rem;background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:#a1a1aa;font-size:0.85rem;cursor:pointer;font-family:inherit}
        .xi-btn-sec:hover{color:#e4e4e7;border-color:rgba(255,255,255,0.2)}
        .xi-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
        .xi-map-row{display:flex;flex-direction:column;gap:4px;font-size:0.72rem;color:#71717a;font-weight:600;text-transform:uppercase;letter-spacing:0.03em}
        .xi-map-row select{background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f4f4f5;font-size:0.85rem;padding:0.5rem 0.6rem;font-family:inherit;text-transform:none;letter-spacing:0;font-weight:400}
        .xi-tabs{display:flex;gap:6px;flex-wrap:wrap}
        .xi-tab{padding:0.45rem 0.9rem;border-radius:999px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.8rem;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
        .xi-tab.on{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .xi-badge{background:#f5c842;color:#000;font-size:0.68rem;font-weight:700;border-radius:999px;padding:0 6px}
        .xi-list{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto;padding-right:4px}
        .xi-row{border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.7rem 0.8rem;display:flex;flex-direction:column;gap:8px}
        .xi-row-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .xi-row-name{font-size:0.85rem;font-weight:600;color:#e4e4e7}
        .xi-row-meta{font-size:0.75rem;color:#71717a}
        .xi-row-body{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .xi-arrow{color:#22c55e}
        .xi-cand{display:inline-flex;align-items:center;gap:8px;min-width:0}
        .xi-cand-img{width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;font-size:0.9rem}
        .xi-cand-img img{width:100%;height:100%;object-fit:cover}
        .xi-cand-name{font-size:0.8rem;color:#d4d4d8}
        .xi-options{display:flex;flex-direction:column;gap:4px}
        .xi-opt{display:flex;align-items:center;gap:8px;padding:0.4rem 0.5rem;border-radius:8px;cursor:pointer;font-size:0.8rem;color:#a1a1aa}
        .xi-opt:hover{background:rgba(255,255,255,0.03)}
        .xi-opt.on{background:rgba(249,115,22,0.08)}
        .xi-opt input{accent-color:#f97316}
        .xi-tag{font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:4px;background:rgba(245,200,66,0.1);color:#f5c842}
        .xi-link{background:none;border:none;color:#71717a;font-size:0.75rem;cursor:pointer;text-decoration:underline;font-family:inherit;padding:0}
        .xi-link:hover{color:#f97316}
        .xi-muted{font-size:0.78rem;color:#52525b}
        .xi-center{text-align:center;align-items:center}
        .xi-center-row{justify-content:center}
        .xi-more{align-self:center}
        .xi-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px}
        .xi-total{font-size:0.82rem;color:#a1a1aa}
        .xi-total b{color:#f4f4f5}
        .xi-warn{color:#f5c842}
        .xi-done-icon{font-size:2.2rem}
        .xi-error{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;font-size:0.85rem;border-radius:10px;padding:0.65rem 1rem}
      `}</style>
    </div>
  );
}
