"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Professional } from "@/types";

const CITIES = ["Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec"];

export default function ProfessionalProfilePage() {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [serviceInput, setServiceInput] = useState("");

  const [form, setForm] = useState({
    name: "", profession: "", description: "",
    phone: "", city: "", address: "",
    pricePerHour: "", experience: "",
  });
  const [services, setServices] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const snap = await getDoc(doc(db, "professionals", user.uid));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Professional;
        setProfessional(data);
        setForm({
          name: data.name || "",
          profession: data.profession || "",
          description: data.description || "",
          phone: data.phone || "",
          city: data.city || "",
          address: data.address || "",
          pricePerHour: data.pricePerHour?.toString() || "",
          experience: data.experience || "",
        });
        setServices(data.services || []);
        if (data.photo) setPhotoPreview(data.photo);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const addService = () => {
    if (serviceInput.trim() && !services.includes(serviceInput.trim())) {
      setServices(p => [...p, serviceInput.trim()]);
      setServiceInput("");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError(""); setSuccess(false);
    try {
      let photoUrl = professional?.photo || "";
      if (photoFile) {
        const r = ref(storage, `professionals/${user.uid}/photo_${Date.now()}`);
        await uploadBytes(r, photoFile);
        photoUrl = await getDownloadURL(r);
      }
      await updateDoc(doc(db, "professionals", user.uid), {
        name: form.name.trim(),
        profession: form.profession.trim(),
        description: form.description.trim(),
        phone: form.phone.trim(),
        city: form.city,
        address: form.address.trim(),
        pricePerHour: form.pricePerHour ? parseFloat(form.pricePerHour) : null,
        experience: form.experience.trim(),
        services,
        photo: photoUrl,
        updatedAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError("Gabim gjatë ruajtjes. Provo përsëri.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(168,85,247,0.2);border-top-color:#c084fc;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="prof-profile-page">
      <div className="prof-page-header">
        <h1>Edito profilin</h1>
        <p>Përditëso informacionin tënd profesional</p>
      </div>

      {success && <div className="prof-alert-ok">✓ Profili u ruajt me sukses!</div>}
      {error && <div className="prof-alert-err">{error}</div>}

      <div className="prof-form-grid">
        {/* Left - Photo */}
        <div className="prof-card">
          <h2 className="prof-card-title">Foto profili</h2>
          <label className="prof-photo-upload">
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPhotoFile(file);
                const reader = new FileReader();
                reader.onload = ev => setPhotoPreview(ev.target?.result as string);
                reader.readAsDataURL(file);
              }} />
            {photoPreview
              ? <img src={photoPreview} alt="foto" className="prof-photo-preview" />
              : <div className="prof-photo-placeholder"><span>👤</span><span>Ngarko foton</span></div>
            }
          </label>
          <p className="prof-hint">Klik mbi foto për të ndryshuar</p>
        </div>

        {/* Right - Info */}
        <div className="prof-card">
          <h2 className="prof-card-title">Informacioni bazë</h2>
          <div className="prof-fields">
            <div className="prof-field">
              <label>Emri i plotë *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="prof-field">
              <label>Profesioni *</label>
              <input type="text" value={form.profession} onChange={e => setForm(p => ({ ...p, profession: e.target.value }))} />
            </div>
            <div className="prof-field-row">
              <div className="prof-field">
                <label>Qyteti *</label>
                <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}>
                  <option value="">Zgjidh...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="prof-field">
                <label>Telefoni *</label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="prof-field-row">
              <div className="prof-field">
                <label>Çmimi/orë (L)</label>
                <input type="number" value={form.pricePerHour} onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))} />
              </div>
              <div className="prof-field">
                <label>Eksperienca</label>
                <input type="text" placeholder="p.sh. 5 vjet" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} />
              </div>
            </div>
            <div className="prof-field">
              <label>Adresa</label>
              <input type="text" placeholder="Lagja, rruga..." value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="prof-field">
              <label>Përshkrim</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="prof-card">
        <h2 className="prof-card-title">Shërbimet</h2>
        <div className="service-input-wrap">
          <input type="text" placeholder="Shto shërbim të ri..."
            value={serviceInput}
            onChange={e => setServiceInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addService())} />
          <button type="button" onClick={addService} className="service-add-btn">+ Shto</button>
        </div>
        <div className="service-tags">
          {services.map(s => (
            <span key={s} className="service-tag">
              {s}
              <button type="button" onClick={() => setServices(p => p.filter(x => x !== s))}>✕</button>
            </span>
          ))}
        </div>
      </div>

      <div className="prof-save-row">
        <button onClick={handleSave} disabled={saving} className="prof-btn-save">
          {saving ? "Duke ruajtur..." : "💾 Ruaj ndryshimet"}
        </button>
      </div>

      <style>{`
        .prof-profile-page { display: flex; flex-direction: column; gap: 1.25rem; }
        .prof-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.025em; margin-bottom: 0.25rem; }
        .prof-page-header p { font-size: 0.85rem; color: #71717a; }
        .prof-alert-ok { padding: 0.75rem 1rem; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); color: #22c55e; border-radius: 10px; font-size: 0.875rem; }
        .prof-alert-err { padding: 0.75rem 1rem; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 10px; font-size: 0.875rem; }
        .prof-form-grid { display: grid; grid-template-columns: 220px 1fr; gap: 1.25rem; }
        .prof-card { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.5rem; }
        .prof-card-title { font-size: 0.9rem; font-weight: 700; color: #e4e4e7; margin-bottom: 1.25rem; }
        .prof-photo-upload { display: block; cursor: pointer; border: 1.5px dashed rgba(255,255,255,0.12); border-radius: 50%; width: 120px; height: 120px; margin: 0 auto 0.75rem; overflow: hidden; transition: border-color .2s; }
        .prof-photo-upload:hover { border-color: rgba(168,85,247,0.4); }
        .prof-photo-preview { width: 100%; height: 100%; object-fit: cover; }
        .prof-photo-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
        .prof-photo-placeholder span:first-child { font-size: 2rem; }
        .prof-photo-placeholder span:last-child { font-size: 0.7rem; color: #71717a; }
        .prof-hint { font-size: 0.72rem; color: #52525b; text-align: center; }
        .prof-fields { display: flex; flex-direction: column; gap: 0.875rem; }
        .prof-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .prof-field label { font-size: 0.78rem; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.02em; }
        .prof-field input, .prof-field select, .prof-field textarea { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #f4f4f5; font-size: 0.875rem; padding: 0.65rem 0.85rem; outline: none; font-family: inherit; transition: border-color .2s; resize: vertical; }
        .prof-field input:focus, .prof-field select:focus, .prof-field textarea:focus { border-color: rgba(168,85,247,0.5); box-shadow: 0 0 0 3px rgba(168,85,247,0.1); }
        .prof-field select option { background: #1c1c1c; }
        .prof-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
        .service-input-wrap { display: flex; gap: 8px; margin-bottom: 10px; }
        .service-input-wrap input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #f4f4f5; font-size: 0.875rem; padding: 0.65rem 0.85rem; outline: none; font-family: inherit; }
        .service-input-wrap input:focus { border-color: rgba(168,85,247,0.5); }
        .service-add-btn { padding: 0.65rem 1rem; background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.3); border-radius: 10px; color: #c084fc; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .service-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .service-tag { display: flex; align-items: center; gap: 5px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2); border-radius: 999px; padding: 4px 10px; font-size: 0.78rem; color: #c084fc; }
        .service-tag button { background: none; border: none; cursor: pointer; color: #c084fc; font-size: 0.7rem; padding: 0; }
        .prof-save-row { display: flex; justify-content: flex-end; }
        .prof-btn-save { padding: 0.75rem 2rem; background: #f97316; color: white; border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: 0 4px 20px rgba(249,115,22,0.3); transition: background .2s; }
        .prof-btn-save:hover:not(:disabled) { background: #ea6c0a; }
        .prof-btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
        @media(max-width:768px) { .prof-form-grid { grid-template-columns: 1fr; } .prof-field-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
