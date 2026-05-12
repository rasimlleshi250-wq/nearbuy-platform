"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Link from "next/link";

interface ParsedProduct {
  name: string;
  category: string;
  brand: string;
  description: string;
  tags: string;
  image_url: string;
  status: "active" | "inactive";
  error?: string;
}

const REQUIRED_COLS = ["name", "category"];
const ALL_COLS = ["name", "category", "brand", "description", "tags", "image_url", "status"];

function downloadTemplate() {
  const header = "name,category,brand,description,tags,image_url,status";
  const examples = [
    "Rubinet kuzhine,Hidraulikë,Borsch,Rubinet me dy doreza për kuzhinë,rubinet;kuzhine;hidraulike,https://example.com/rubinet.jpg,active",
    "Kabllo elektrike 2.5mm,Elektrik,Elko,Kabllo copper për instalime elektrike,kabllo;elektrik;copper,https://example.com/kabllo.jpg,active",
    "Bojë fasade e bardhë,Bojëra,Sadolin,Bojë fasade me rezistencë ndaj shiut,boje;fasade;e bardhe,https://example.com/boje.jpg,active",
    "Çimento Portland 42.5,Ndërtim,,Çimento e klasit të lartë për ndërtim,çimento;ndërtim,,active",
  ];
  const csv = [header, ...examples].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nearbuy_produktet_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): ParsedProduct[] {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const products: ParsedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { cols.push(current.trim()); current = ""; }
      else { current += char; }
    }
    cols.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ""; });

    const p: ParsedProduct = {
      name: row.name || "",
      category: row.category || "",
      brand: row.brand || "",
      description: row.description || "",
      tags: row.tags || "",
      image_url: row.image_url || "",
      status: (row.status === "inactive" ? "inactive" : "active"),
    };

    if (!p.name) p.error = "Emri mungon";
    else if (!p.category) p.error = "Kategoria mungon";

    products.push(p);
  }
  return products;
}

export default function ImportProductsPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      alert("Ngarko vetëm skedar CSV!");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const products = parseCSV(text);
      setParsed(products);
      setDone(false);
      setImported(0);
      setErrors(0);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const validProducts = parsed.filter(p => !p.error);
  const invalidProducts = parsed.filter(p => p.error);

  const handleImport = async () => {
    if (!user || !validProducts.length) return;
    setImporting(true);
    let ok = 0, err = 0;

    for (const p of validProducts) {
      try {
        await addDoc(collection(db, "products"), {
          name: p.name.trim(),
          category: p.category.trim(),
          brand: p.brand.trim(),
          description: p.description.trim(),
          tags: p.tags ? p.tags.split(";").map(t => t.trim()).filter(Boolean) : [],
          images: p.image_url ? [p.image_url] : [],
          status: p.status,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        ok++;
        setImported(ok);
      } catch (e) {
        console.error(e);
        err++;
        setErrors(err);
      }
    }

    setImporting(false);
    setDone(true);
  };

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <div className="adm-breadcrumb">
              <Link href="/admin/products">Produktet</Link>
              <span>›</span>
              <span>Import CSV</span>
            </div>
            <h1>Import produktesh</h1>
            <p>Ngarko shumë produkte njëherësh nga Excel/CSV</p>
          </div>
          <button onClick={downloadTemplate} className="adm-btn-secondary">
            ⬇ Shkarko template CSV
          </button>
        </div>
      </div>

      {/* Udhëzime */}
      <div className="imp-steps">
        <div className="imp-step">
          <div className="imp-step-num">1</div>
          <div>
            <p className="imp-step-title">Shkarko template</p>
            <p className="imp-step-sub">Kliko "Shkarko template CSV" dhe hap me Excel</p>
          </div>
        </div>
        <div className="imp-arrow">→</div>
        <div className="imp-step">
          <div className="imp-step-num">2</div>
          <div>
            <p className="imp-step-title">Plotëso produktet</p>
            <p className="imp-step-sub">Shto produktet rresht pas rreshti. Ruaje si CSV</p>
          </div>
        </div>
        <div className="imp-arrow">→</div>
        <div className="imp-step">
          <div className="imp-step-num">3</div>
          <div>
            <p className="imp-step-title">Ngarko skedarin</p>
            <p className="imp-step-sub">Drag & drop ose kliko për të zgjedhur skedarin</p>
          </div>
        </div>
        <div className="imp-arrow">→</div>
        <div className="imp-step">
          <div className="imp-step-num">4</div>
          <div>
            <p className="imp-step-title">Konfirmo import</p>
            <p className="imp-step-sub">Shqyrto preview dhe kliko "Importo"</p>
          </div>
        </div>
      </div>

      {/* Kolonat e nevojshme */}
      <div className="imp-cols-card">
        <p className="imp-cols-title">Kolonat e CSV-it:</p>
        <div className="imp-cols">
          {ALL_COLS.map(col => (
            <span key={col} className={`imp-col ${REQUIRED_COLS.includes(col) ? "required" : "optional"}`}>
              {col} {REQUIRED_COLS.includes(col) ? "*" : ""}
            </span>
          ))}
        </div>
        <p className="imp-cols-note">* E detyrueshme &nbsp;|&nbsp; Tags ndahen me pikëpresje (;) &nbsp;|&nbsp; Status: active ose inactive</p>
      </div>

      {/* Upload zone */}
      {!parsed.length && (
        <div
          className={`imp-drop ${dragOver ? "imp-drop-active" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          <div className="imp-drop-icon">📂</div>
          <p className="imp-drop-title">Drag & drop skedarin CSV këtu</p>
          <p className="imp-drop-sub">ose kliko për të zgjedhur</p>
          <span className="imp-drop-hint">Suporton: .csv</span>
        </div>
      )}

      {/* Preview */}
      {parsed.length > 0 && !done && (
        <div className="imp-preview">
          <div className="imp-preview-header">
            <div className="imp-preview-stats">
              <span className="imp-stat-ok">✓ {validProducts.length} produkte të vlefshme</span>
              {invalidProducts.length > 0 && (
                <span className="imp-stat-err">✗ {invalidProducts.length} me gabime</span>
              )}
            </div>
            <div className="imp-preview-actions">
              <button onClick={() => { setParsed([]); if (fileRef.current) fileRef.current.value = ""; }} className="adm-btn-secondary">
                ✕ Pastro
              </button>
              <button onClick={handleImport} disabled={importing || !validProducts.length} className="adm-btn-primary">
                {importing ? `Duke importuar ${imported}/${validProducts.length}...` : `⬆ Importo ${validProducts.length} produkte`}
              </button>
            </div>
          </div>

          {importing && (
            <div className="imp-progress">
              <div className="imp-progress-bar" style={{ width: `${(imported / validProducts.length) * 100}%` }} />
            </div>
          )}

          <div className="imp-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Emri</th>
                  <th>Kategoria</th>
                  <th>Marka</th>
                  <th>Tags</th>
                  <th>Statusi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className={p.error ? "imp-row-err" : ""}>
                    <td className="imp-num">{i + 1}</td>
                    <td>
                      <div className="imp-prod-cell">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="imp-prod-thumb"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : <span className="imp-no-img">📦</span>}
                        <span className="imp-prod-name">{p.name || "—"}</span>
                      </div>
                    </td>
                    <td><span className="imp-badge">{p.category || "—"}</span></td>
                    <td><span className="imp-muted">{p.brand || "—"}</span></td>
                    <td><span className="imp-muted">{p.tags ? p.tags.split(";").slice(0, 2).join(", ") : "—"}</span></td>
                    <td>
                      <span className={`imp-status ${p.status}`}>
                        {p.status === "active" ? "● Aktiv" : "○ Joaktiv"}
                      </span>
                    </td>
                    <td>
                      {p.error && <span className="imp-err-msg">⚠ {p.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="imp-done">
          <div className="imp-done-icon">🎉</div>
          <h2>Importi u krye!</h2>
          <p><strong style={{ color: "#22c55e" }}>{imported} produkte</strong> u shtuan me sukses{errors > 0 ? `, ${errors} dështuan` : ""}.</p>
          <div className="imp-done-btns">
            <Link href="/admin/products" className="adm-btn-primary">Shiko produktet →</Link>
            <button onClick={() => { setParsed([]); setDone(false); if (fileRef.current) fileRef.current.value = ""; }} className="adm-btn-secondary">
              Import tjetër
            </button>
          </div>
        </div>
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.5rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .adm-breadcrumb{display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#71717a;margin-bottom:0.4rem}
        .adm-breadcrumb a{color:#71717a;text-decoration:none}
        .adm-breadcrumb a:hover{color:#f97316}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:2px}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-btn-primary{padding:0.65rem 1.5rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:background .2s;font-family:inherit;white-space:nowrap}
        .adm-btn-primary:hover:not(:disabled){background:#ea6c0a}
        .adm-btn-primary:disabled{opacity:0.55;cursor:not-allowed}
        .adm-btn-secondary{padding:0.65rem 1.25rem;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;border-radius:10px;font-size:0.875rem;font-weight:500;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all .2s;font-family:inherit;white-space:nowrap}
        .adm-btn-secondary:hover{border-color:rgba(255,255,255,0.2);color:#e4e4e7}
        .imp-steps{display:flex;align-items:center;gap:8px;background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.25rem;margin-bottom:1.25rem;flex-wrap:wrap}
        .imp-step{display:flex;align-items:center;gap:10px;flex:1;min-width:140px}
        .imp-step-num{width:28px;height:28px;border-radius:50%;background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);color:#f97316;font-size:0.8rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .imp-step-title{font-size:0.82rem;font-weight:600;color:#e4e4e7;margin-bottom:2px}
        .imp-step-sub{font-size:0.72rem;color:#71717a;line-height:1.4}
        .imp-arrow{color:#3f3f46;font-size:1rem;flex-shrink:0}
        .imp-cols-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
        .imp-cols-title{font-size:0.8rem;font-weight:600;color:#a1a1aa;white-space:nowrap}
        .imp-cols{display:flex;gap:6px;flex-wrap:wrap;flex:1}
        .imp-col{font-size:0.75rem;font-weight:600;padding:3px 10px;border-radius:6px}
        .imp-col.required{background:rgba(249,115,22,0.12);color:#f97316;border:1px solid rgba(249,115,22,0.25)}
        .imp-col.optional{background:rgba(255,255,255,0.05);color:#71717a;border:1px solid rgba(255,255,255,0.08)}
        .imp-cols-note{font-size:0.72rem;color:#52525b;white-space:nowrap}
        .imp-drop{background:#141414;border:2px dashed rgba(255,255,255,0.12);border-radius:16px;padding:3rem 2rem;text-align:center;cursor:pointer;transition:all .2s}
        .imp-drop:hover,.imp-drop-active{border-color:rgba(249,115,22,0.4);background:rgba(249,115,22,0.04)}
        .imp-drop-icon{font-size:3rem;margin-bottom:1rem}
        .imp-drop-title{font-size:1rem;font-weight:600;color:#e4e4e7;margin-bottom:4px}
        .imp-drop-sub{font-size:0.85rem;color:#71717a;margin-bottom:1rem}
        .imp-drop-hint{font-size:0.75rem;color:#52525b;background:rgba(255,255,255,0.04);padding:3px 10px;border-radius:6px}
        .imp-preview{display:flex;flex-direction:column;gap:1rem}
        .imp-preview-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .imp-preview-stats{display:flex;gap:12px;align-items:center}
        .imp-stat-ok{font-size:0.875rem;font-weight:600;color:#22c55e}
        .imp-stat-err{font-size:0.875rem;font-weight:600;color:#f87171}
        .imp-preview-actions{display:flex;gap:8px}
        .imp-progress{height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden}
        .imp-progress-bar{height:100%;background:#f97316;border-radius:2px;transition:width .3s}
        .imp-table-wrap{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:auto}
        .imp-table{width:100%;border-collapse:collapse;min-width:600px}
        .imp-table th{padding:0.65rem 1rem;text-align:left;font-size:0.72rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .imp-table td{padding:0.75rem 1rem;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:middle}
        .imp-table tr:last-child td{border-bottom:none}
        .imp-row-err td{background:rgba(239,68,68,0.05)!important}
        .imp-num{font-size:0.75rem;color:#52525b;width:30px}
        .imp-prod-cell{display:flex;align-items:center;gap:8px}
        .imp-prod-thumb{width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.08)}
        .imp-no-img{font-size:1.2rem;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border-radius:6px;flex-shrink:0}
        .imp-prod-name{font-size:0.875rem;font-weight:600;color:#e4e4e7}
        .imp-badge{font-size:0.75rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:2px 8px;color:#a1a1aa}
        .imp-muted{font-size:0.8rem;color:#71717a}
        .imp-status{font-size:0.75rem;font-weight:600;padding:2px 8px;border-radius:4px}
        .imp-status.active{background:rgba(34,197,94,0.1);color:#22c55e}
        .imp-status.inactive{background:rgba(239,68,68,0.08);color:#f87171}
        .imp-err-msg{font-size:0.72rem;color:#f87171;white-space:nowrap}
        .imp-done{text-align:center;padding:3rem;background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:16px}
        .imp-done-icon{font-size:3rem;margin-bottom:1rem}
        .imp-done h2{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:0.5rem}
        .imp-done p{font-size:0.9rem;color:#71717a;margin-bottom:1.5rem}
        .imp-done-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
      `}</style>
    </div>
  );
}
