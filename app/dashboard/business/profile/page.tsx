"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

const CITIES = ["Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec", "Peshkopi"];
const CATEGORIES = ["Hidraulikë", "Elektrik", "Ndërtim", "Bojëra"];

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [docId, setDocId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    categories: [] as string[],
    city: "",
    address: "",
    phone: "",
    description: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const bizSnap = await getDoc(doc(db, "businesses", user.uid));
        if (bizSnap.exists()) {
          const d = bizSnap.data();
          setDocId(user.uid);
          setForm({
            name: d.name || "",
            categories: d.categories || (d.category ? [d.category] : []),
            city: d.city || "",
            address: d.address || "",
            phone: d.phone || "",
            description: d.description || "",
          });
        } else {
          const q = query(collection(db, "businesses"), where("ownerUID", "==", user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0].data();
            setDocId(snap.docs[0].id);
            setForm({
              name: d.name || "",
              categories: d.categories || (d.category ? [d.category] : []),
              city: d.city || "",
              address: d.address || "",
              phone: d.phone || "",
              description: d.description || "",
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const toggleCategory = (cat: string) => {
    setForm(p => ({
      ...p,
      categories: p.categories.includes(cat)
        ? p.categories.filter(c => c !== cat)
        : [...p.categories, cat]
    }));
  };

  const handleSave = async () => {
    if (!user || !docId) return;
    if (!form.name || form.categories.length === 0 || !form.city || !form.address || !form.phone) {
      setError("Plotëso të gjitha fushat e detyrueshme dhe zgjidh të paktën një kategori.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "businesses", docId), {
        name: form.name.trim(),
        categories: form.categories,
        category: form.categories[0],
        city: form.city,
        address: form.address.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      setError("Gabim gjatë ruajtjes. Provo përsëri.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="pf-root">
      <div className="pf-header">
        <h1 className="pf-title">Profili i dyqanit</h1>
        <p className="pf-sub">Ndrysho të dhënat e biznesit tënd</p>
      </div>

      <div className="pf-card">
        <div className="pf-fields">
          <div className="pf-field">
            <label>Emri i dyqanit <span className="req">*</span></label>
            <input type="text" value={form.name} onChange={f("name")} placeholder="p.sh. Elektronika ABC" />
          </div>

          <div className="pf-field">
            <label>Kategoritë <span className="req">*</span></label>
            <div className="pf-cat-grid">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`pf-cat-btn ${form.categories.includes(cat) ? "active" : ""}`}
                >
                  {form.categories.includes(cat) ? "✓ " : ""}{cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-row">
            <div className="pf-field">
              <label>Qyteti <span className="req">*</span></label>
              <select value={form.city} onChange={f("city")}>
                <option value="">Zgjidh...</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>Telefoni <span className="req">*</span></label>
              <input type="tel" value={form.phone} onChange={f("phone")} placeholder="+355 6X XXX XXXX" />
            </div>
          </div>

          <div className="pf-field">
            <label>Adresa <span className="req">*</span></label>
            <input type="text" value={form.address} onChange={f("address")} placeholder="Rruga, Lagjja, Nr." />
          </div>

          <div className="pf-field">
            <label>Përshkrim <span className="pf-opt">(opsional)</span></label>
            <textarea rows={4} value={form.description} onChange={f("description")} placeholder="Çfarë ofron dyqani yt..." />
          </div>
        </div>

        {error && <div className="pf-error">{error}</div>}
        {saved && <div className="pf-success">✓ Ndryshimet u ruajtën me sukses!</div>}

        <button onClick={handleSave} disabled={saving} className="pf-btn">
          {saving ? <><span className="nb-spin nb-spin-w" /> Duke ruajtur...</> : "Ruaj ndryshimet"}
        </button>
      </div>

      <style>{`
        .pf-cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .pf-cat-btn { padding: 0.6rem 0.9rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #a1a1aa; font-size: 0.85rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: left; }
        .pf-cat-btn:hover { background: rgba(249,115,22,0.08); border-color: rgba(249,115,22,0.2); color: #f97316; }
        .pf-cat-btn.active { background: rgba(249,115,22,0.12); border-color: rgba(249,115,22,0.4); color: #f97316; font-weight: 600; }
        .pf-root { display: flex; flex-direction: column; gap: 1.5rem; max-width: 600px; }
        .pf-title { font-size: 1.3rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.02em; }
        .pf-sub { font-size: 0.82rem; color: #71717a; margin-top: 2px; }
        .pf-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; }
        .pf-fields { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.25rem; }
        .pf-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .pf-field label { font-size: 0.78rem; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.02em; }
        .req { color: #f97316; }
        .pf-opt { color: #52525b; font-weight: 400; text-transform: none; font-size: 0.75rem; }
        .pf-field input, .pf-field select, .pf-field textarea { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #f4f4f5; font-size: 0.875rem; padding: 0.7rem 0.9rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; resize: vertical; }
        .pf-field input:focus, .pf-field select:focus, .pf-field textarea:focus { border-color: rgba(249,115,22,0.5); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .pf-field input::placeholder, .pf-field textarea::placeholder { color: #3f3f46; }
        .pf-field select option { background: #1c1c1c; }
        .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .pf-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 0.85rem; border-radius: 10px; padding: 0.65rem 0.9rem; margin-bottom: 1rem; }
        .pf-success { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); color: #22c55e; font-size: 0.85rem; border-radius: 10px; padding: 0.65rem 0.9rem; margin-bottom: 1rem; }
        .pf-btn { width: 100%; padding: 0.75rem; background: #f97316; color: white; border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
        .pf-btn:hover:not(:disabled) { background: #ea6c0a; }
        .pf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .nb-spin { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.25); border-top-color: currentColor; border-radius: 50%; animation: spin 0.65s linear infinite; }
        .nb-spin-w { border-color: rgba(255,255,255,0.25); border-top-color: white; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) { .pf-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
