"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface Subcategory {
  id: string;
  name: string;
  categoryName: string;
  order: number;
}

const CATEGORIES = ["Hidraulikë", "Elektrik", "Ndërtim", "Bojëra & Kimikate", "Kopshtari"];

const DEFAULT_SUBCATEGORIES: Omit<Subcategory, "id">[] = [
  // Hidraulikë
  { name: "Rubineta Kuzhine", categoryName: "Hidraulikë", order: 1 },
  { name: "Rubineta Banjo", categoryName: "Hidraulikë", order: 2 },
  { name: "Tuba & Fitingje", categoryName: "Hidraulikë", order: 3 },
  { name: "Pompa Uji", categoryName: "Hidraulikë", order: 4 },
  { name: "Motopompa & Gjeneratorë", categoryName: "Hidraulikë", order: 5 },
  { name: "Vana & Çifte", categoryName: "Hidraulikë", order: 6 },
  { name: "Kazanë Uji", categoryName: "Hidraulikë", order: 7 },
  { name: "Aksesorë Banjo", categoryName: "Hidraulikë", order: 8 },
  { name: "Kanalizime & Sifone", categoryName: "Hidraulikë", order: 9 },
  // Elektrik
  { name: "Ndriçim LED", categoryName: "Elektrik", order: 1 },
  { name: "Prozhektor", categoryName: "Elektrik", order: 2 },
  { name: "Spot & Lustër", categoryName: "Elektrik", order: 3 },
  { name: "Çelësa & Prize", categoryName: "Elektrik", order: 4 },
  { name: "Kabllo & Tuba", categoryName: "Elektrik", order: 5 },
  { name: "Panele & Siguresa", categoryName: "Elektrik", order: 6 },
  { name: "Vegla Elektrike", categoryName: "Elektrik", order: 7 },
  { name: "Aksesorë Elektrik", categoryName: "Elektrik", order: 8 },
  // Ndërtim
  { name: "Vegla Dore", categoryName: "Ndërtim", order: 1 },
  { name: "Aksesore Veglaesh", categoryName: "Ndërtim", order: 2 },
  { name: "Makineri Ndërtimi", categoryName: "Ndërtim", order: 3 },
  { name: "Saldim & Prerje", categoryName: "Ndërtim", order: 4 },
  { name: "Fiksim & Bulloneri", categoryName: "Ndërtim", order: 5 },
  { name: "Shkallë & Skela", categoryName: "Ndërtim", order: 6 },
  { name: "Kompresor & Pistoleta", categoryName: "Ndërtim", order: 7 },
  { name: "Çimento & Materiale", categoryName: "Ndërtim", order: 8 },
  { name: "Izolim", categoryName: "Ndërtim", order: 9 },
  { name: "Pllaka & Karolle", categoryName: "Ndërtim", order: 10 },
  { name: "Vegla Pune & Siguri", categoryName: "Ndërtim", order: 11 },
  // Bojëra & Kimikate
  { name: "Bojë Murale", categoryName: "Bojëra & Kimikate", order: 1 },
  { name: "Bojë Fasade", categoryName: "Bojëra & Kimikate", order: 2 },
  { name: "Llak & Impregnim", categoryName: "Bojëra & Kimikate", order: 3 },
  { name: "Spraj & Silikone", categoryName: "Bojëra & Kimikate", order: 4 },
  { name: "Ngjites & Shkumë", categoryName: "Bojëra & Kimikate", order: 5 },
  { name: "Lubrifikant & Vaj", categoryName: "Bojëra & Kimikate", order: 6 },
  { name: "Aksesorë Bojimi", categoryName: "Bojëra & Kimikate", order: 7 },
  { name: "Kimikate Pastrimi", categoryName: "Bojëra & Kimikate", order: 8 },
  { name: "Kontejnerë & Bidonë", categoryName: "Bojëra & Kimikate", order: 9 },
  { name: "Kimikate Ndërtimi", categoryName: "Bojëra & Kimikate", order: 10 },
  // Kopshtari
  { name: "Motokosa & Krasitëse", categoryName: "Kopshtari", order: 1 },
  { name: "Sharra Zinxhiri", categoryName: "Kopshtari", order: 2 },
  { name: "Vegla Kopshtarie", categoryName: "Kopshtari", order: 3 },
  { name: "Ujitje & Zorre", categoryName: "Kopshtari", order: 4 },
  { name: "Aksesore Kopshtarie & Pyjore", categoryName: "Kopshtari", order: 5 },
];

export default function AdminSubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState("Hidraulikë");
  const [addForm, setAddForm] = useState({ name: "", categoryName: "Hidraulikë" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubcategories();
  }, []);

  const loadSubcategories = async () => {
    try {
      const q = query(collection(db, "subcategories"), orderBy("order"));
      const snap = await getDocs(q);
      setSubcategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subcategory)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const seedSubcategories = async () => {
    if (!confirm(`Do të shtohen ${DEFAULT_SUBCATEGORIES.length} nënkategori. Vazhdo?`)) return;
    setSeeding(true);
    try {
      for (const sub of DEFAULT_SUBCATEGORIES) {
        await addDoc(collection(db, "subcategories"), sub);
      }
      await loadSubcategories();
      alert("✓ Të 50 nënkategoritë u shtuan me sukses!");
    } catch (e) { console.error(e); alert("Gabim gjatë shtimit."); }
    finally { setSeeding(false); }
  };

  const addSubcategory = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const existing = subcategories.filter(s => s.categoryName === addForm.categoryName);
      await addDoc(collection(db, "subcategories"), {
        name: addForm.name.trim(),
        categoryName: addForm.categoryName,
        order: existing.length + 1,
      });
      setAddForm(p => ({ ...p, name: "" }));
      await loadSubcategories();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "subcategories", id), { name: editName.trim() });
      setEditId(null);
      await loadSubcategories();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteSubcat = async (id: string, name: string) => {
    if (!confirm(`Fshi "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "subcategories", id));
      setSubcategories(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  };

  const filtered = subcategories.filter(s => s.categoryName === activeTab);

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <h1>Nënkategoritë</h1>
            <p>{subcategories.length} nënkategori gjithsej</p>
          </div>
          {subcategories.length === 0 && (
            <button onClick={seedSubcategories} disabled={seeding} className="adm-btn-primary">
              {seeding ? "Duke shtuar..." : "⚡ Shto të 50 nënkategoritë"}
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="sc-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)}
            className={`sc-tab ${activeTab === cat ? "active" : ""}`}>
            {cat}
            <span className="sc-count">
              {subcategories.filter(s => s.categoryName === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Add form */}
      <div className="sc-add-form">
        <input type="text" placeholder={`Shto nënkategori te ${activeTab}...`}
          value={addForm.name}
          onChange={e => setAddForm(p => ({ ...p, name: e.target.value, categoryName: activeTab }))}
          onKeyDown={e => e.key === "Enter" && addSubcategory()}
          className="sc-add-input" />
        <button onClick={addSubcategory} disabled={saving || !addForm.name.trim()} className="adm-btn-primary">
          + Shto
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="adm-loading">Duke ngarkuar...</div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          <p>Nuk ka nënkategori për {activeTab}.</p>
          {subcategories.length === 0 && (
            <p style={{ marginTop: "8px", fontSize: "0.82rem", color: "#71717a" }}>
              Kliko "Shto të 50 nënkategoritë" për të shtuar listën e plotë automatikisht.
            </p>
          )}
        </div>
      ) : (
        <div className="sc-list">
          {filtered.map((s, i) => (
            <div key={s.id} className="sc-item">
              <span className="sc-order">{i + 1}</span>
              {editId === s.id ? (
                <input type="text" value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEdit(s.id)}
                  className="sc-edit-input" autoFocus />
              ) : (
                <span className="sc-name">{s.name}</span>
              )}
              <div className="sc-actions">
                {editId === s.id ? (
                  <>
                    <button onClick={() => saveEdit(s.id)} disabled={saving} className="sc-btn-save">✓</button>
                    <button onClick={() => setEditId(null)} className="sc-btn-cancel">✕</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditId(s.id); setEditName(s.name); }} className="sc-btn-edit">✏️</button>
                    <button onClick={() => deleteSubcat(s.id, s.name)} className="sc-btn-del">🗑</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .adm-page-header{margin-bottom:1.5rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em;margin-bottom:0.25rem}
        .adm-page-header p{font-size:0.85rem;color:#71717a}
        .adm-btn-primary{padding:0.6rem 1.2rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s;white-space:nowrap}
        .adm-btn-primary:hover:not(:disabled){background:#ea6c0a}
        .adm-btn-primary:disabled{opacity:0.5;cursor:not-allowed}
        .adm-loading,.adm-empty{text-align:center;padding:3rem;color:#71717a;font-size:0.9rem}
        .sc-tabs{display:flex;gap:6px;margin-bottom:1.25rem;flex-wrap:wrap}
        .sc-tab{display:flex;align-items:center;gap:6px;padding:0.5rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .sc-tab:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .sc-tab.active{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .sc-count{background:rgba(255,255,255,0.08);color:#71717a;font-size:0.7rem;font-weight:700;padding:1px 6px;border-radius:999px}
        .sc-tab.active .sc-count{background:rgba(249,115,22,0.2);color:#f97316}
        .sc-add-form{display:flex;gap:8px;margin-bottom:1.25rem}
        .sc-add-input{flex:1;padding:0.65rem 1rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;outline:none;font-family:inherit;transition:border-color .2s}
        .sc-add-input:focus{border-color:rgba(249,115,22,0.4)}
        .sc-add-input::placeholder{color:#3f3f46}
        .sc-list{display:flex;flex-direction:column;gap:6px}
        .sc-item{display:flex;align-items:center;gap:12px;background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.75rem 1rem}
        .sc-order{font-size:0.75rem;color:#52525b;font-weight:600;width:20px;flex-shrink:0}
        .sc-name{font-size:0.875rem;color:#e4e4e7;flex:1}
        .sc-edit-input{flex:1;padding:0.4rem 0.7rem;background:rgba(255,255,255,0.06);border:1px solid rgba(249,115,22,0.4);border-radius:6px;color:#f4f4f5;font-size:0.875rem;outline:none;font-family:inherit}
        .sc-actions{display:flex;gap:5px}
        .sc-btn-edit{background:none;border:none;cursor:pointer;font-size:0.85rem;padding:4px 6px;border-radius:4px;color:#71717a;transition:color .2s}
        .sc-btn-edit:hover{color:#f97316}
        .sc-btn-del{background:none;border:none;cursor:pointer;font-size:0.85rem;padding:4px 6px;border-radius:4px;color:#71717a;transition:color .2s}
        .sc-btn-del:hover{color:#f87171}
        .sc-btn-save{background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);color:#22c55e;border-radius:6px;padding:4px 10px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit}
        .sc-btn-cancel{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:6px;padding:4px 10px;font-size:0.82rem;cursor:pointer;font-family:inherit}
      `}</style>
    </div>
  );
}
