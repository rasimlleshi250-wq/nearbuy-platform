"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp, GeoPoint } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";

const PROFESSIONS = [
  "Elektriçist", "Hidraulik", "Murator", "Bojaxhi", "Karpentier",
  "Instalues kondicionerësh", "Teknik elektronike", "Instalues dyshemesh",
  "Gipsar", "Fasadist", "Teknik gazi", "Teknik lavatricesh",
  "Gurgdhedhës", "Rrobaqepës", "Berber", "Kozmetiste",
  "Pastruese", "Kuzhinier", "Fotograf", "Tjetër"
];

const CITIES = ["Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec"];

const SCHEDULE_DAYS = ["E Hënë", "E Martë", "E Mërkurë", "E Enjte", "E Premte", "E Shtunë", "E Diel"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

interface DaySchedule { open: boolean; from: string; to: string; }

export default function ProfessionalSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locTab, setLocTab] = useState<"gps" | "maps">("gps");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [form, setForm] = useState({
    name: "",
    profession: "",
    customProfession: "",
    description: "",
    phone: "",
    city: "",
    address: "",
    pricePerHour: "",
    experience: "",
    lat: 0,
    lng: 0,
    mapsLink: "",
  });

  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");

  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(SCHEDULE_DAYS.map(d => [d, { open: d !== "E Diel", from: "08:00", to: "18:00" }]))
  );

  const addService = () => {
    if (serviceInput.trim() && !services.includes(serviceInput.trim())) {
      setServices(p => [...p, serviceInput.trim()]);
      setServiceInput("");
    }
  };

  const removeService = (s: string) => setServices(p => p.filter(x => x !== s));

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(p => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude })); setLocating(false); },
      () => { setError("Nuk mund të merret lokacioni."); setLocating(false); }
    );
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const r = ref(storage, `professionals/${user!.uid}/photo_${Date.now()}`);
    await uploadBytes(r, file);
    return await getDownloadURL(r);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.name || !form.profession || !form.phone || !form.city) {
      setError("Plotëso të gjitha fushat e detyrueshme."); return;
    }
    setLoading(true); setError("");
    try {
      let photoUrl = "";
      if (photoFile) photoUrl = await uploadPhoto(photoFile);

      const scheduleStr = Object.entries(schedule)
        .filter(([, v]) => v.open)
        .map(([day, v]) => `${day}: ${v.from}–${v.to}`)
        .join(", ");

      const finalProfession = form.profession === "Tjetër" ? form.customProfession : form.profession;

      await addDoc(collection(db, "professionals"), {
        ownerUID: user.uid,
        name: form.name.trim(),
        profession: finalProfession,
        description: form.description.trim(),
        phone: form.phone.trim(),
        city: form.city,
        address: form.address.trim(),
        services,
        pricePerHour: form.pricePerHour ? parseFloat(form.pricePerHour) : null,
        experience: form.experience.trim(),
        schedule: scheduleStr,
        location: form.lat && form.lng ? new GeoPoint(form.lat, form.lng) : null,
        photo: photoUrl,
        subscription: "free",
        verified: false,
        featured: false,
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard/professional");
    } catch (err) {
      console.error(err);
      setError("Gabim gjatë ruajtjes. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  const canNext1 = form.name && form.profession && form.phone && form.city &&
    (form.profession !== "Tjetër" || form.customProfession);

  return (
    <main className="setup-root">
      <div className="setup-blob-a" /><div className="setup-blob-b" /><div className="setup-grid" />

      <div className="setup-card">
        <div className="setup-header">
          <Link href="/" className="setup-brand">
            <div className="setup-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
                <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
              </svg>
            </div>
            <span>NearBuy<em>.al</em></span>
          </Link>
          <div className="setup-steps">
            {[1,2,3].map(s => (
              <div key={s} className={`setup-step ${step >= s ? "active" : ""} ${step > s ? "done" : ""}`}>
                {step > s ? "✓" : s}
              </div>
            ))}
          </div>
        </div>

        <div className="setup-titles">
          {step === 1 && <><h1>Të dhënat e tua</h1><p>Informacioni bazë i profilit tënd profesional</p></>}
          {step === 2 && <><h1>Shërbimet & Orari</h1><p>Çfarë ofron dhe kur je i disponueshëm</p></>}
          {step === 3 && <><h1>Foto & Lokacioni</h1><p>Bëje profilin tënd tërheqës</p></>}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="setup-fields">
            <div className="setup-field">
              <label>Emri i plotë <span className="req">*</span></label>
              <input type="text" placeholder="Emri Mbiemri" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="setup-field">
              <label>Profesioni <span className="req">*</span></label>
              <select value={form.profession} onChange={e => setForm(p => ({ ...p, profession: e.target.value }))}>
                <option value="">Zgjidh profesionin...</option>
                {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {form.profession === "Tjetër" && (
              <div className="setup-field">
                <label>Specifiko profesionin <span className="req">*</span></label>
                <input type="text" placeholder="p.sh. Instalues panelesh diellore"
                  value={form.customProfession}
                  onChange={e => setForm(p => ({ ...p, customProfession: e.target.value }))} />
              </div>
            )}

            <div className="setup-row">
              <div className="setup-field">
                <label>Qyteti <span className="req">*</span></label>
                <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}>
                  <option value="">Zgjidh qytetin...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="setup-field">
                <label>Telefoni <span className="req">*</span></label>
                <input type="tel" placeholder="+355 6X XXX XXXX" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div className="setup-row">
              <div className="setup-field">
                <label>Çmimi / orë (L)</label>
                <input type="number" placeholder="p.sh. 1500" value={form.pricePerHour}
                  onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))} />
              </div>
              <div className="setup-field">
                <label>Vjet eksperience</label>
                <input type="text" placeholder="p.sh. 5 vjet" value={form.experience}
                  onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} />
              </div>
            </div>

            <div className="setup-field">
              <label>Përshkrim i shkurtër</label>
              <textarea rows={3} placeholder="Paraqit veten — çfarë bën, çfarë të dallon..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="setup-fields">
            <div className="setup-field">
              <label>Shërbimet që ofron</label>
              <div className="service-input-wrap">
                <input type="text" placeholder="p.sh. Instalim prizash, Riparim paneli elektrik..."
                  value={serviceInput}
                  onChange={e => setServiceInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addService())} />
                <button type="button" onClick={addService} className="service-add-btn">+ Shto</button>
              </div>
              {services.length > 0 && (
                <div className="service-tags">
                  {services.map(s => (
                    <span key={s} className="service-tag">
                      {s}
                      <button type="button" onClick={() => removeService(s)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <span className="setup-hint">Shtyp Enter ose klik "+ Shto" për çdo shërbim</span>
            </div>

            <div className="setup-field" style={{ marginTop: "0.5rem" }}>
              <label>Orari i disponueshmërisë</label>
            </div>
            <div className="setup-schedule">
              {SCHEDULE_DAYS.map(day => (
                <div key={day} className={`schedule-row ${!schedule[day].open ? "closed" : ""}`}>
                  <div className="schedule-day-wrap">
                    <button type="button"
                      onClick={() => setSchedule(p => ({ ...p, [day]: { ...p[day], open: !p[day].open } }))}
                      className={`schedule-toggle ${schedule[day].open ? "on" : "off"}`} />
                    <span className="schedule-day">{day}</span>
                  </div>
                  {schedule[day].open ? (
                    <div className="schedule-times">
                      <select value={schedule[day].from}
                        onChange={e => setSchedule(p => ({ ...p, [day]: { ...p[day], from: e.target.value } }))}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span>—</span>
                      <select value={schedule[day].to}
                        onChange={e => setSchedule(p => ({ ...p, [day]: { ...p[day], to: e.target.value } }))}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="schedule-closed">Joaktiv</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="setup-fields">
            <div className="setup-field">
              <label>Foto profili</label>
              <label className="photo-upload-area">
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoFile(file);
                    const reader = new FileReader();
                    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }} />
                {photoPreview ? (
                  <img src={photoPreview} alt="foto" className="photo-preview photo-circle" />
                ) : (
                  <div className="photo-placeholder">
                    <span>👤</span>
                    <span>Ngarko foton tënde</span>
                    <span className="photo-hint">PNG, JPG · Rekomandohet katrore</span>
                  </div>
                )}
              </label>
            </div>

            <div className="setup-field">
              <label>Adresa e punës</label>
              <input type="text" placeholder="Lagja, rruga (opsionale)" value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>

            <div className="setup-field">
              <label>Lokacioni <span className="setup-optional">(opsional)</span></label>
              <div className="loc-tabs">
                <button type="button" onClick={() => setLocTab("gps")} className={`loc-tab ${locTab === "gps" ? "active" : ""}`}>📍 GPS</button>
                <button type="button" onClick={() => setLocTab("maps")} className={`loc-tab ${locTab === "maps" ? "active" : ""}`}>🔗 Google Maps</button>
              </div>
              {locTab === "gps" && (
                <button type="button" onClick={getLocation} disabled={locating} className="setup-gps-btn">
                  {locating ? <span className="nb-spin" /> : "📍"}
                  {locating ? "Duke marrë lokacionin..." : form.lat ? `✓ ${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}` : "Merr lokacionin tim"}
                </button>
              )}
              {locTab === "maps" && (
                <div>
                  <input type="text" placeholder="https://maps.app.goo.gl/..."
                    value={form.mapsLink}
                    onChange={e => {
                      const link = e.target.value;
                      setForm(p => ({ ...p, mapsLink: link }));
                      const m = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                      if (m) setForm(p => ({ ...p, mapsLink: link, lat: parseFloat(m[1]), lng: parseFloat(m[2]) }));
                    }} />
                  {form.lat && form.mapsLink && <p className="loc-success">✓ Koordinatat u gjetën</p>}
                </div>
              )}
            </div>

            <div className="setup-info-box">
              <p>🎉 Gati! Profili yt do të shfaqet në NearBuy.al pasi të aprovohet nga ekipi ynë brenda 24 orëve.</p>
            </div>
          </div>
        )}

        {error && <div className="setup-error">{error}</div>}

        <div className="setup-nav">
          {step > 1 && <button type="button" onClick={() => setStep(s => s - 1)} className="setup-btn-back">← Kthehu</button>}
          {step < 3 ? (
            <button type="button" onClick={() => { setError(""); setStep(s => s + 1); }}
              disabled={step === 1 && !canNext1} className="setup-btn-next">
              Vazhdo →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} className="setup-btn-next">
              {loading ? <><span className="nb-spin nb-spin-w" /> Duke ruajtur...</> : "Regjistro profilin 🚀"}
            </button>
          )}
        </div>
        <p className="setup-footer">Hap {step} nga 3</p>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .setup-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #f5f5f4; position: relative; overflow: hidden; }
        .setup-blob-a { position: fixed; width: 500px; height: 500px; border-radius: 50%; filter: blur(100px); background: radial-gradient(circle, rgba(249,115,22,0.15), transparent 70%); top: -150px; right: -100px; pointer-events: none; z-index: 0; }
        .setup-blob-b { position: fixed; width: 380px; height: 380px; border-radius: 50%; filter: blur(100px); background: radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%); bottom: -100px; left: -80px; pointer-events: none; z-index: 0; }
        .setup-grid { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px; }
        .setup-card { position: relative; z-index: 1; background: rgba(20,20,20,0.97); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 2.25rem 2rem; width: 100%; max-width: 520px; box-shadow: 0 25px 60px rgba(0,0,0,0.6); animation: up 0.45s cubic-bezier(.22,.68,0,1.15) both; }
        @keyframes up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .setup-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.75rem; }
        .setup-brand { display: flex; align-items: center; gap: 9px; text-decoration: none; }
        .setup-logo { width: 34px; height: 34px; border-radius: 9px; background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.2); display: flex; align-items: center; justify-content: center; }
        .setup-brand span { font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .setup-brand em { color: #f97316; font-style: normal; }
        .setup-steps { display: flex; align-items: center; gap: 6px; }
        .setup-step { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #71717a; transition: all 0.2s; }
        .setup-step.active { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.4); color: #f97316; }
        .setup-step.done { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.4); color: #22c55e; }
        .setup-titles { margin-bottom: 1.5rem; }
        .setup-titles h1 { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.025em; margin-bottom: 0.3rem; }
        .setup-titles p { font-size: 0.875rem; color: #71717a; }
        .setup-fields { display: flex; flex-direction: column; gap: 1rem; }
        .setup-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .setup-field label { font-size: 0.8rem; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.02em; }
        .req { color: #f97316; }
        .setup-optional { color: #52525b; font-weight: 400; text-transform: none; font-size: 0.75rem; }
        .setup-field input, .setup-field select, .setup-field textarea { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; color: #f4f4f5; font-size: 0.875rem; padding: 0.72rem 0.9rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; resize: vertical; }
        .setup-field input::placeholder, .setup-field textarea::placeholder { color: #3f3f46; }
        .setup-field input:focus, .setup-field select:focus, .setup-field textarea:focus { border-color: rgba(249,115,22,0.5); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .setup-field select option { background: #1c1c1c; }
        .setup-hint { font-size: 0.75rem; color: #52525b; margin-top: 3px; }
        .setup-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .service-input-wrap { display: flex; gap: 8px; }
        .service-input-wrap input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; color: #f4f4f5; font-size: 0.875rem; padding: 0.72rem 0.9rem; outline: none; font-family: inherit; }
        .service-input-wrap input:focus { border-color: rgba(249,115,22,0.5); }
        .service-add-btn { padding: 0.72rem 1rem; background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.3); border-radius: 11px; color: #f97316; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .service-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .service-tag { display: flex; align-items: center; gap: 5px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); border-radius: 999px; padding: 3px 10px; font-size: 0.78rem; color: #f97316; }
        .service-tag button { background: none; border: none; cursor: pointer; color: #f97316; font-size: 0.7rem; padding: 0; }
        .setup-schedule { display: flex; flex-direction: column; gap: 6px; }
        .schedule-row { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; transition: opacity 0.2s; }
        .schedule-row.closed { opacity: 0.5; }
        .schedule-day-wrap { display: flex; align-items: center; gap: 10px; }
        .schedule-toggle { width: 36px; height: 20px; border-radius: 10px; border: none; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .schedule-toggle::after { content: ''; position: absolute; width: 14px; height: 14px; border-radius: 50%; background: white; top: 3px; transition: left 0.2s; }
        .schedule-toggle.on { background: #f97316; }
        .schedule-toggle.on::after { left: 19px; }
        .schedule-toggle.off { background: rgba(255,255,255,0.15); }
        .schedule-toggle.off::after { left: 3px; }
        .schedule-day { font-size: 0.82rem; font-weight: 500; color: #e4e4e7; min-width: 85px; }
        .schedule-times { display: flex; align-items: center; gap: 6px; }
        .schedule-times select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; color: #e4e4e7; font-size: 0.78rem; padding: 3px 6px; outline: none; font-family: inherit; }
        .schedule-times span { color: #52525b; }
        .schedule-closed { font-size: 0.78rem; color: #52525b; }
        .photo-upload-area { display: block; border: 1.5px dashed rgba(255,255,255,0.12); border-radius: 14px; cursor: pointer; overflow: hidden; transition: border-color 0.2s; max-width: 200px; }
        .photo-upload-area:hover { border-color: rgba(249,115,22,0.4); }
        .photo-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 1.5rem; }
        .photo-placeholder span:first-child { font-size: 2rem; }
        .photo-placeholder span:nth-child(2) { font-size: 0.85rem; color: #a1a1aa; font-weight: 500; }
        .photo-hint { font-size: 0.72rem; color: #52525b; }
        .photo-preview { width: 100%; object-fit: cover; display: block; }
        .photo-circle { height: 160px; object-fit: cover; }
        .setup-gps-btn { display: flex; align-items: center; gap: 8px; padding: 0.72rem 1rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; color: #a1a1aa; font-size: 0.875rem; cursor: pointer; font-family: inherit; transition: all 0.2s; width: 100%; }
        .setup-gps-btn:hover:not(:disabled) { border-color: rgba(249,115,22,0.3); color: #f97316; }
        .setup-gps-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .loc-tabs { display: flex; gap: 6px; margin-bottom: 8px; }
        .loc-tab { flex: 1; padding: 0.5rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #71717a; font-size: 0.8rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
        .loc-tab:hover { background: rgba(255,255,255,0.05); color: #e4e4e7; }
        .loc-tab.active { background: rgba(249,115,22,0.12); border-color: rgba(249,115,22,0.3); color: #f97316; }
        .loc-success { font-size: 0.78rem; color: #22c55e; margin-top: 5px; }
        .setup-info-box { background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.2); border-radius: 12px; padding: 1rem; }
        .setup-info-box p { font-size: 0.875rem; color: #fdba74; line-height: 1.5; }
        .setup-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 0.85rem; border-radius: 10px; padding: 0.65rem 0.9rem; margin-top: 1rem; }
        .setup-nav { display: flex; gap: 10px; margin-top: 1.75rem; }
        .setup-btn-back { padding: 0.75rem 1.25rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #a1a1aa; font-size: 0.875rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .setup-btn-back:hover { border-color: rgba(255,255,255,0.2); color: #e4e4e7; }
        .setup-btn-next { flex: 1; padding: 0.75rem; background: #f97316; color: white; border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s, transform 0.15s; box-shadow: 0 4px 20px rgba(249,115,22,0.3); }
        .setup-btn-next:hover:not(:disabled) { background: #ea6c0a; transform: translateY(-1px); }
        .setup-btn-next:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .setup-footer { text-align: center; margin-top: 1rem; font-size: 0.78rem; color: #52525b; }
        .nb-spin { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.25); border-top-color: currentColor; border-radius: 50%; animation: spin 0.65s linear infinite; }
        .nb-spin-w { border-color: rgba(255,255,255,0.25); border-top-color: white; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) { .setup-card { padding: 1.75rem 1.25rem; } .setup-row { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
