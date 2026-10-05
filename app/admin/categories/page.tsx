"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Category } from "@/types";

const ICONS = ["🛍", "📱", "💻", "🏠", "🚗", "👗", "🍔", "💊", "📚", "🔧", "⚡", "🌿", "🎮", "🎨", "🏋️", "🐾", "✈️", "💄", "🪑", "🔌", "🏗️", "🪚", "🔩", "🌱", "⛏️"];

const DEFAULT_CATEGORIES = [
  { name: "Hidraulikë", icon: "🔧", order: 1 },
  { name: "Elektrik", icon: "⚡", order: 2 },
  { name: "Ndërtim", icon: "🏗️", order: 3 },
  { name: "Bojëra & Kimikate", icon: "🎨", order: 4 },
  { name: "Kopshtari", icon: "🌿", order: 5 },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "🛍" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCategories = async () => {
    const q = query(collection(db, "categories"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const seedCategories = async () => {
    if (!confirm("Do të shtohen 5 kategoritë kryesore. Vazhdo?")) return;
    setSeeding(true);
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await addDoc(collection(db, "categories"), cat);
      }
      await fetchCategories();
      alert("✓ Kategoritë u shtuan me sukses!");
    } catch (e) {
      alert("Gabim gjatë shtimit.");
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Emri është i detyrueshëm."); return; }
    if (categories.some(c => c.name.toLowerCase() === form.name.trim().toLowerCase())) {
      setError("Kjo kategori ekziston tashmë."); return;
    }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "categories"), {
        name: form.name.trim(),
        icon: form.icon,
        order: categories.length + 1,
      });
      setForm({ name: "", icon: "🛍" });
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      setError("Gabim gjatë ruajtjes.");
    } finally {
      setSaving(false);
    }
  };

  // Fshirja lejohet VETËM kur kategoria nuk ka produkte dhe nënkategori.
  // Përndryshe mijëra produkte do mbeteshin pa kategori.
  const handleDelete = async (c: Category) => {
    setDeleting(c.id);
    try {
      const [prods, subs] = await Promise.all([
        getCountFromServer(query(collection(db, "products"), where("category", "==", c.name))),
        getCountFromServer(query(collection(db, "subcategories"), where("categoryName", "==", c.name))),
      ]);
      const nProds = prods.data().count, nSubs = subs.data().count;
      if (nProds > 0 || nSubs > 0) {
        alert(
          `"${c.name}" nuk mund të fshihet.\n\n` +
          `Ka ${nProds.toLocaleString()} produkte dhe ${nSubs} nënkategori.\n` +
          `Zhvendosi ose fshiji ato më parë.`
        );
        return;
      }
      if (!confirm(`Fshi kategorinë "${c.name}"? Nuk ka produkte, kështu që nuk preket asgjë tjetër.`)) return;
      await deleteDoc(doc(db, "categories", c.id));
      setCategories(prev => prev.filter(x => x.id !== c.id));
    } catch (e) {
      console.error(e);
      alert("Kontrolli dështoi. Provo përsëri.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Kategoritë</h1>
            <p>{categories.length} kategori gjithsej</p>
          </div>
          <div style={{display:"flex",gap:8}}>
            {categories.length === 0 && (
              <button onClick={seedCategories} disabled={seeding} className="adm-btn-seed">
                {seeding ? "Duke shtuar..." : "⚡ Shto 5 kategoritë"}
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)} className="adm-btn-primary">
              {showForm ? "Anulo" : "+ Shto kategori"}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="adm-card" style={{ marginBottom: "1.25rem" }}>
          <h2 className="adm-card-title">Kategori e re</h2>
          <form onSubmit={handleAdd}>
            <div className="adm-field-row">
              <div className="adm-field">
                <label>Emri <span className="req">*</span></label>
                <input type="text" placeholder="p.sh. Kopshtari"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label>Ikona</label>
                <div className="adm-icon-grid">
                  {ICONS.map(ic => (
                    <button key={ic} type="button"
                      className={`adm-icon-btn ${form.icon === ic ? "selected" : ""}`}
                      onClick={() => setForm(p => ({ ...p, icon: ic }))}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <div className="adm-alert adm-alert-err">{error}</div>}
            <div className="adm-form-actions">
              <button type="submit" disabled={saving} className="adm-btn-primary">
                {saving ? "Duke ruajtur..." : "Ruaj kategorinë"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="adm-loading">Duke ngarkuar...</div>
      ) : categories.length === 0 ? (
        <div className="adm-empty">
          <p>📁 Nuk ka kategori akoma.</p>
          <button onClick={seedCategories} disabled={seeding} className="adm-btn-primary" style={{ marginTop: "1rem" }}>
            {seeding ? "Duke shtuar..." : "⚡ Shto 5 kategoritë"}
          </button>
        </div>
      ) : (
        <div className="adm-cat-grid">
          {categories.map(c => (
            <div key={c.id} className="adm-cat-card">
              <span className="adm-cat-icon">{c.icon}</span>
              <div className="adm-cat-info">
                <p className="adm-cat-name">{c.name}</p>
                <p className="adm-cat-order">Rendi: {c.order}</p>
              </div>
              <button onClick={() => handleDelete(c)} disabled={deleting === c.id} className="adm-cat-delete"
                title="Fshi (vetëm nëse nuk ka produkte)">
                {deleting === c.id ? "…" : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.5rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-btn-primary{padding:0.6rem 1.2rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s;white-space:nowrap;font-family:inherit}
        .adm-btn-primary:hover:not(:disabled){background:#ea6c0a}
        .adm-btn-primary:disabled{opacity:0.55;cursor:not-allowed}
        .adm-btn-seed{padding:0.6rem 1.2rem;background:rgba(249,115,22,0.15);color:#f97316;border:1px solid rgba(249,115,22,0.3);border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;white-space:nowrap}
        .adm-btn-seed:hover:not(:disabled){background:rgba(249,115,22,0.25)}
        .adm-btn-seed:disabled{opacity:0.55;cursor:not-allowed}
        .adm-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.5rem}
        .adm-card-title{font-size:0.95rem;font-weight:700;color:#e4e4e7;margin-bottom:1.25rem}
        .adm-field{display:flex;flex-direction:column;gap:0.4rem;margin-bottom:1rem}
        .adm-field label{font-size:0.8rem;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.02em}
        .req{color:#f97316}
        .adm-field input{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;padding:0.7rem 0.9rem;outline:none;transition:border-color .2s;font-family:inherit}
        .adm-field input:focus{border-color:rgba(249,115,22,0.5);box-shadow:0 0 0 3px rgba(249,115,22,0.1)}
        .adm-field-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .adm-icon-grid{display:flex;flex-wrap:wrap;gap:6px}
        .adm-icon-btn{width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);font-size:1.1rem;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center}
        .adm-icon-btn:hover{border-color:rgba(249,115,22,0.3);background:rgba(249,115,22,0.08)}
        .adm-icon-btn.selected{border-color:#f97316;background:rgba(249,115,22,0.15)}
        .adm-alert{padding:0.65rem 1rem;border-radius:8px;font-size:0.85rem;margin:0.75rem 0}
        .adm-alert-err{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171}
        .adm-form-actions{display:flex;justify-content:flex-end;margin-top:0.5rem}
        .adm-loading,.adm-empty{text-align:center;padding:3rem;color:#71717a;font-size:0.9rem}
        .adm-cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
        .adm-cat-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1rem;display:flex;align-items:center;gap:12px;transition:border-color .2s}
        .adm-cat-card:hover{border-color:rgba(255,255,255,0.15)}
        .adm-cat-icon{font-size:1.5rem;flex-shrink:0}
        .adm-cat-info{flex:1}
        .adm-cat-name{font-size:0.9rem;font-weight:600;color:#e4e4e7}
        .adm-cat-order{font-size:0.75rem;color:#52525b}
        .adm-cat-delete{background:none;border:none;color:#52525b;cursor:pointer;font-size:0.9rem;padding:4px;border-radius:6px;transition:color .2s,background .2s}
        .adm-cat-delete:hover{color:#f87171;background:rgba(239,68,68,0.1)}
      `}</style>
    </div>
  );
}
