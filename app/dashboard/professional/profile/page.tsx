"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { PROFESSIONS, normalizeProfession, getEffectiveProPlan, PRO_PLANS, ProPlanDef } from "@/lib/proPlans";
import { DAYS, DayHours, defaultHours, isValidHours, hoursToSchedule, normalizeWhatsApp } from "@/lib/businessInfo";

const CITIES = ["Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec", "Peshkopi"];
const DESC_EXAMPLE = "p.sh. Hidraulik me 10 vjet përvojë në Durrës. Instalime të reja, riparime defektesh, bojlerë dhe sanitari. Vij brenda ditës dhe jap garanci për punën.";

async function uploadImage(file: File, folder: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dvqcrh4qf";
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "nearbuy_products");
  fd.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
  return data.secure_url as string;
}

export default function ProfessionalProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");
  const [plan, setPlan] = useState<ProPlanDef>(PRO_PLANS.free);
  const [serviceInput, setServiceInput] = useState("");
  const [hasSavedHours, setHasSavedHours] = useState(false);

  const [form, setForm] = useState({
    name: "", profession: "", description: "", phone: "", whatsapp: "", whatsappSame: true,
    city: "", address: "", pricePerHour: "", experience: "",
  });
  const [services, setServices] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [photo, setPhoto] = useState("");
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [hours, setHours] = useState<DayHours[]>(defaultHours());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "professionals", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          const phone = String(d.phone || ""), wa = String(d.whatsapp || "");
          setForm({
            name: d.name || "",
            profession: normalizeProfession(d.profession),
            description: d.description || "",
            phone,
            whatsapp: wa,
            whatsappSame: !wa || normalizeWhatsApp(wa) === normalizeWhatsApp(phone),
            city: d.city || "",
            address: d.address || "",
            pricePerHour: d.pricePerHour?.toString() || "",
            experience: d.experience || "",
          });
          setServices(Array.isArray(d.services) ? d.services : []);
          setZones(Array.isArray(d.zones) ? d.zones.filter((z: string) => z !== d.city) : []);
          setPhoto(d.photo || "");
          setWorkPhotos(Array.isArray(d.workPhotos) ? d.workPhotos : []);
          if (isValidHours(d.hours)) { setHours(d.hours); setHasSavedHours(true); }
          setPlan(getEffectiveProPlan(d));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(p => ({ ...p, [k]: e.target.value }));

  const addService = () => {
    const v = serviceInput.trim();
    if (v && !services.includes(v)) { setServices(p => [...p, v]); setServiceInput(""); }
  };

  const extraZonesAllowed = plan.maxZones - 1;
  const toggleZone = (c: string) => {
    if (zones.includes(c)) { setZones(z => z.filter(x => x !== c)); return; }
    if (zones.length >= extraZonesAllowed) {
      alert(extraZonesAllowed === 0
        ? "Me paketën Falas punon në 1 qytet. Me Pro ose Premium shton deri në 3 qytete."
        : `Paketa jote lejon deri në ${plan.maxZones} qytete gjithsej.`);
      return;
    }
    setZones(z => [...z, c]);
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    setUploading("avatar"); setError("");
    try { setPhoto(await uploadImage(file, "nearbuy/professionals")); }
    catch (e) { console.error(e); setError("Fotoja nuk u ngarkua."); }
    finally { setUploading(""); }
  };

  const uploadWork = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const free = plan.maxPhotos - workPhotos.length;
    if (free <= 0) {
      setError(`Paketa ${plan.name} lejon ${plan.maxPhotos} foto punimesh. ${plan.id === "free" ? "Me Pro ke deri në 20." : ""}`);
      return;
    }
    setUploading("work"); setError("");
    try {
      const list = Array.from(files).slice(0, free);
      const urls: string[] = [];
      for (const f of list) urls.push(await uploadImage(f, "nearbuy/professionals/work"));
      setWorkPhotos(p => [...p, ...urls]);
      if (files.length > free) setError(`U ngarkuan vetëm ${free} foto, sa lejon paketa.`);
    } catch (e) { console.error(e); setError("Disa foto nuk u ngarkuan."); }
    finally { setUploading(""); }
  };

  const setDay = (i: number, patch: Partial<DayHours>) => setHours(h => h.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const checks = [
    { label: "Foto profili", done: !!photo },
    { label: "Profesioni", done: !!form.profession },
    { label: "Foto punimesh", done: workPhotos.length > 0 },
    { label: "Orari", done: hasSavedHours },
    { label: "Përshkrim (80+ shkronja)", done: form.description.trim().length >= 80 },
    { label: "Shërbimet", done: services.length > 0 },
  ];
  const percent = Math.round(checks.filter(c => c.done).length / checks.length * 100);

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.profession || !form.city || !form.phone.trim()) {
      setError("Plotëso emrin, profesionin, qytetin dhe telefonin."); return;
    }
    setSaving(true); setError(""); setSuccess(false);
    try {
      const allZones = [form.city, ...zones.filter(z => z !== form.city)].slice(0, plan.maxZones);
      await updateDoc(doc(db, "professionals", user.uid), {
        name: form.name.trim(),
        profession: form.profession,
        description: form.description.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsappSame ? form.phone.trim() : form.whatsapp.trim(),
        city: form.city,
        zones: allZones,
        address: form.address.trim(),
        pricePerHour: form.pricePerHour ? parseFloat(form.pricePerHour) : null,
        experience: form.experience.trim(),
        services,
        photo,
        workPhotos: workPhotos.slice(0, plan.maxPhotos),
        hours,
        schedule: hoursToSchedule(hours),
        updatedAt: serverTimestamp(),
      });
      setHasSavedHours(true);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setError("Gabim gjatë ruajtjes. Provo përsëri.");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(168,85,247,0.2);border-top-color:#c084fc;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="pp-root">
      <div className="pp-header">
        <div>
          <h1>Profili im</h1>
          <p>Kjo është ajo që shohin klientët kur të kërkojnë · Paketa {plan.name}</p>
        </div>
        {user && <Link href={`/professionals/${user.uid}`} target="_blank" className="pp-preview">👁 Shiko profilin publik</Link>}
      </div>

      <div className="pp-card">
        <div className="pp-progress-top"><span>Profili është <b>{percent}%</b> i plotë</span>{percent === 100 && <span className="pp-ok">✓ Gati</span>}</div>
        <div className="pp-bar"><div style={{ width: `${percent}%` }} /></div>
        {percent < 100 && <p className="pp-missing">Mungon: {checks.filter(c => !c.done).map(c => c.label).join(" · ")}</p>}
      </div>

      <div className="pp-grid">
        <div className="pp-card pp-center">
          <h2 className="pp-title">Foto profili</h2>
          <label className="pp-avatar">
            <input type="file" accept="image/*" hidden onChange={e => uploadAvatar(e.target.files?.[0])} />
            {photo ? <img src={photo} alt="foto" /> : <span>{uploading === "avatar" ? "..." : "👤"}</span>}
          </label>
          <p className="pp-hint">Një foto e qartë e fytyrës krijon besim.</p>
        </div>

        <div className="pp-card">
          <h2 className="pp-title">Informacioni bazë</h2>
          <div className="pp-fields">
            <div className="pp-row">
              <div className="pp-field"><label>Emri i plotë *</label><input value={form.name} onChange={set("name")} /></div>
              <div className="pp-field"><label>Profesioni *</label>
                <select value={form.profession} onChange={set("profession")}>
                  <option value="">Zgjidh...</option>
                  {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  {form.profession && !PROFESSIONS.includes(form.profession) && <option value={form.profession}>{form.profession}</option>}
                </select>
              </div>
            </div>
            <div className="pp-row">
              <div className="pp-field"><label>Telefoni *</label><input type="tel" value={form.phone} onChange={set("phone")} placeholder="068 123 4567" /></div>
              <div className="pp-field"><label>WhatsApp</label>
                <label className="pp-check"><input type="checkbox" checked={form.whatsappSame} onChange={e => setForm(p => ({ ...p, whatsappSame: e.target.checked }))} />I njëjti me telefonin</label>
                {!form.whatsappSame && <input type="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="069 123 4567" />}
              </div>
            </div>
            <div className="pp-row">
              <div className="pp-field"><label>Çmimi/orë (L)</label><input type="number" value={form.pricePerHour} onChange={set("pricePerHour")} /></div>
              <div className="pp-field"><label>Eksperienca</label><input value={form.experience} onChange={set("experience")} placeholder="p.sh. 10 vjet" /></div>
            </div>
            <div className="pp-field"><label>Përshkrim ({form.description.trim().length} shkronja)</label>
              <textarea rows={4} value={form.description} onChange={set("description")} placeholder={DESC_EXAMPLE} />
            </div>
          </div>
        </div>
      </div>

      <div className="pp-card">
        <h2 className="pp-title">Ku punon</h2>
        <div className="pp-row">
          <div className="pp-field"><label>Qyteti kryesor *</label>
            <select value={form.city} onChange={set("city")}>
              <option value="">Zgjidh...</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="pp-field"><label>Adresa / lagjja</label><input value={form.address} onChange={set("address")} placeholder="Lagja, rruga..." /></div>
        </div>
        <div className="pp-field" style={{ marginTop: 12 }}>
          <label>Qytete të tjera ({zones.length}/{extraZonesAllowed}) {extraZonesAllowed === 0 && <span className="pp-lock">🔒 nga paketa Pro</span>}</label>
          <div className="pp-chips">
            {CITIES.filter(c => c !== form.city).map(c => (
              <button key={c} type="button" onClick={() => toggleZone(c)} className={`pp-chip ${zones.includes(c) ? "on" : ""}`}>
                {zones.includes(c) ? "✓ " : ""}{c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pp-card">
        <h2 className="pp-title">Foto punimesh ({workPhotos.length}/{plan.maxPhotos})</h2>
        <p className="pp-hint">Foto para dhe pas punës janë mënyra më e mirë për të fituar klientë.</p>
        <div className="pp-gallery">
          {workPhotos.map((u, i) => (
            <div key={u} className="pp-photo">
              <img src={u} alt={`punim ${i + 1}`} />
              <button type="button" onClick={() => setWorkPhotos(p => p.filter(x => x !== u))}>✕</button>
            </div>
          ))}
          {workPhotos.length < plan.maxPhotos && (
            <label className="pp-photo pp-add">
              <input type="file" accept="image/*" multiple hidden onChange={e => uploadWork(e.target.files)} />
              <span>{uploading === "work" ? "Duke ngarkuar..." : "＋ Shto foto"}</span>
            </label>
          )}
        </div>
        {plan.id === "free" && workPhotos.length >= plan.maxPhotos && (
          <p className="pp-hint">Ke arritur 3 foto. Me paketën Pro ke deri në 20. <Link href="/dashboard/professional" className="pp-link">Shiko paketat</Link></p>
        )}
      </div>

      <div className="pp-card">
        <h2 className="pp-title">Shërbimet</h2>
        <div className="pp-service-input">
          <input placeholder="p.sh. Instalim bojleri" value={serviceInput} onChange={e => setServiceInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addService(); } }} />
          <button type="button" onClick={addService}>+ Shto</button>
        </div>
        <div className="pp-chips">
          {services.map(s => (
            <span key={s} className="pp-chip on">{s}<button type="button" onClick={() => setServices(p => p.filter(x => x !== s))}>✕</button></span>
          ))}
        </div>
      </div>

      <div className="pp-card">
        <h2 className="pp-title">Orari i punës</h2>
        <div className="pp-hours">
          {hours.map((d, i) => (
            <div key={i} className={`pp-hour ${d.closed ? "closed" : ""}`}>
              <span className="pp-day">{DAYS[i]}</span>
              {d.closed ? <span className="pp-hint">Nuk punoj</span> : (
                <span className="pp-times">
                  <input type="time" value={d.open} onChange={e => setDay(i, { open: e.target.value })} />–
                  <input type="time" value={d.close} onChange={e => setDay(i, { close: e.target.value })} />
                </span>
              )}
              <label className="pp-check pp-small"><input type="checkbox" checked={d.closed} onChange={e => setDay(i, { closed: e.target.checked })} />Pushim</label>
            </div>
          ))}
        </div>
      </div>

      {success && <div className="pp-ok-box">✓ Profili u ruajt me sukses!</div>}
      {error && <div className="pp-err">{error}</div>}
      <button onClick={handleSave} disabled={saving || uploading !== ""} className="pp-save">
        {saving ? "Duke ruajtur..." : "💾 Ruaj ndryshimet"}
      </button>

      <style>{`
        .pp-root{display:flex;flex-direction:column;gap:1rem;max-width:860px;padding-bottom:2rem}
        .pp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap}
        .pp-header h1{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:0.25rem}
        .pp-header p{font-size:0.85rem;color:#71717a}
        .pp-preview{font-size:0.82rem;color:#c084fc;text-decoration:none;border:1px solid rgba(168,85,247,0.3);border-radius:10px;padding:0.5rem 0.9rem}
        .pp-card{background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:10px}
        .pp-center{align-items:center;text-align:center}
        .pp-title{font-size:0.92rem;font-weight:700;color:#e4e4e7}
        .pp-progress-top{display:flex;justify-content:space-between;font-size:0.88rem;color:#a1a1aa}
        .pp-progress-top b{color:#c084fc}
        .pp-ok{color:#22c55e;font-weight:600}
        .pp-bar{height:8px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden}
        .pp-bar div{height:100%;background:linear-gradient(90deg,#a855f7,#f97316);border-radius:999px}
        .pp-missing{font-size:0.8rem;color:#f5c842}
        .pp-grid{display:grid;grid-template-columns:220px 1fr;gap:1rem}
        .pp-avatar{width:120px;height:120px;border-radius:50%;border:1.5px dashed rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;font-size:2rem}
        .pp-avatar img{width:100%;height:100%;object-fit:cover}
        .pp-hint{font-size:0.76rem;color:#71717a;line-height:1.5}
        .pp-link{color:#c084fc}
        .pp-fields{display:flex;flex-direction:column;gap:0.85rem}
        .pp-row{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem}
        .pp-field{display:flex;flex-direction:column;gap:0.35rem}
        .pp-field > label{font-size:0.76rem;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.02em}
        .pp-field input,.pp-field select,.pp-field textarea,.pp-service-input input{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;padding:0.65rem 0.85rem;outline:none;font-family:inherit;resize:vertical}
        .pp-field input:focus,.pp-field select:focus,.pp-field textarea:focus{border-color:rgba(168,85,247,0.5)}
        .pp-field select option{background:#1c1c1c}
        .pp-field input::placeholder,.pp-field textarea::placeholder{color:#52525b}
        .pp-check{display:flex;align-items:center;gap:8px;font-size:0.84rem;color:#d4d4d8;cursor:pointer;text-transform:none!important;font-weight:500!important;letter-spacing:0!important}
        .pp-check input{accent-color:#a855f7}
        .pp-small{font-size:0.76rem;color:#71717a}
        .pp-lock{text-transform:none;color:#c084fc;font-weight:500}
        .pp-chips{display:flex;flex-wrap:wrap;gap:6px}
        .pp-chip{display:inline-flex;align-items:center;gap:6px;padding:0.4rem 0.8rem;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#a1a1aa;font-size:0.8rem;cursor:pointer;font-family:inherit}
        .pp-chip.on{background:rgba(168,85,247,0.12);border-color:rgba(168,85,247,0.35);color:#c084fc}
        .pp-chip button{background:none;border:none;color:#c084fc;cursor:pointer;font-size:0.7rem}
        .pp-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
        .pp-photo{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:rgba(255,255,255,0.04)}
        .pp-photo img{width:100%;height:100%;object-fit:cover}
        .pp-photo button{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(0,0,0,0.7);color:#fff;font-size:0.65rem;cursor:pointer}
        .pp-add{display:flex;align-items:center;justify-content:center;border:1.5px dashed rgba(255,255,255,0.15);cursor:pointer;color:#71717a;font-size:0.78rem;text-align:center}
        .pp-service-input{display:flex;gap:8px}
        .pp-service-input input{flex:1}
        .pp-service-input button{padding:0.6rem 1rem;background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.3);border-radius:10px;color:#c084fc;font-weight:600;cursor:pointer;font-family:inherit}
        .pp-hours{display:flex;flex-direction:column;gap:6px}
        .pp-hour{display:grid;grid-template-columns:100px 1fr auto;align-items:center;gap:10px;padding:0.4rem 0.6rem;border-radius:8px;background:rgba(255,255,255,0.02)}
        .pp-hour.closed{opacity:0.6}
        .pp-day{font-size:0.85rem;color:#e4e4e7}
        .pp-times{display:flex;align-items:center;gap:6px;color:#71717a}
        .pp-times input{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f4f4f5;font-size:0.84rem;padding:0.3rem 0.5rem;font-family:inherit;color-scheme:dark}
        .pp-ok-box{background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);color:#22c55e;border-radius:10px;padding:0.7rem 1rem;font-size:0.875rem}
        .pp-err{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:10px;padding:0.7rem 1rem;font-size:0.875rem}
        .pp-save{padding:0.8rem;background:#f97316;color:#fff;border:none;border-radius:12px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;position:sticky;bottom:12px;box-shadow:0 6px 20px rgba(0,0,0,0.4)}
        .pp-save:disabled{opacity:0.55}
        @media(max-width:768px){.pp-grid,.pp-row{grid-template-columns:1fr}.pp-hour{grid-template-columns:1fr auto}.pp-times{grid-column:1/-1}}
      `}</style>
    </div>
  );
}
