"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import {
  DAYS, DayHours, defaultHours, isValidHours, hoursToSchedule, normalizeWhatsApp, PAYMENT_OPTIONS,
} from "@/lib/businessInfo";

const CITIES = ["Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec", "Peshkopi"];
const CATEGORIES = ["Hidraulikë", "Elektrik", "Ndërtim", "Bojëra & Kimikate", "Kopshtari"];
const DESC_EXAMPLE = "p.sh. Dyqan me materiale elektrike dhe hidraulike në Durrës që nga viti 2010. Kemi gjithmonë në stok kabllo, priza, ndriçim LED, tuba dhe rubineta. Ofrojmë transport në qytet dhe këshilla falas për instalimin.";

interface Form {
  name: string;
  categories: string[];
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  whatsappSame: boolean;
  description: string;
  lat: number | null;
  lng: number | null;
  logo: string;
  coverImage: string;
  hours: DayHours[];
  delivery: boolean;
  deliveryNote: string;
  payments: string[];
  facebook: string;
  instagram: string;
}

const EMPTY: Form = {
  name: "", categories: [], city: "", address: "", phone: "", whatsapp: "", whatsappSame: true,
  description: "", lat: null, lng: null, logo: "", coverImage: "", hours: defaultHours(),
  delivery: false, deliveryNote: "", payments: ["Cash"], facebook: "", instagram: "",
};

function fromDoc(d: Record<string, unknown>): Form {
  const loc = d.location as { latitude?: number; longitude?: number } | undefined;
  const lat = typeof d.lat === "number" ? d.lat : loc?.latitude ?? null;
  const lng = typeof d.lng === "number" ? d.lng : loc?.longitude ?? null;
  const phone = String(d.phone || "");
  const whatsapp = String(d.whatsapp || "");
  return {
    name: String(d.name || ""),
    categories: Array.isArray(d.categories) ? (d.categories as string[]) : d.category ? [String(d.category)] : [],
    city: String(d.city || ""),
    address: String(d.address || ""),
    phone,
    whatsapp,
    whatsappSame: !whatsapp || normalizeWhatsApp(whatsapp) === normalizeWhatsApp(phone),
    description: String(d.description || ""),
    // 41.3275,19.8187 ishte vlera e paracaktuar e vjetër (qendra e Tiranës) — nuk llogaritet si lokacion i vendosur
    lat: lat === 41.3275 && lng === 19.8187 ? null : lat,
    lng: lat === 41.3275 && lng === 19.8187 ? null : lng,
    logo: String(d.logo || ""),
    coverImage: String(d.coverImage || ""),
    hours: isValidHours(d.hours) ? (d.hours as DayHours[]) : defaultHours(),
    delivery: !!d.delivery,
    deliveryNote: String(d.deliveryNote || ""),
    payments: Array.isArray(d.payments) ? (d.payments as string[]) : ["Cash"],
    facebook: String(d.facebook || ""),
    instagram: String(d.instagram || ""),
  };
}

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

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [docId, setDocId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [hasSavedHours, setHasSavedHours] = useState(false);
  const [uploading, setUploading] = useState<"" | "logo" | "cover">("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const bizSnap = await getDoc(doc(db, "businesses", user.uid));
        let data: Record<string, unknown> | null = null;
        if (bizSnap.exists()) { setDocId(user.uid); data = bizSnap.data(); }
        else {
          const snap = await getDocs(query(collection(db, "businesses"), where("ownerUID", "==", user.uid)));
          if (!snap.empty) { setDocId(snap.docs[0].id); data = snap.docs[0].data(); }
        }
        if (data) { setForm(fromDoc(data)); setHasSavedHours(isValidHours(data.hours)); }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(p => ({ ...p, [k]: v }));

  const toggleIn = (k: "categories" | "payments", v: string) =>
    setForm(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  const setDay = (i: number, patch: Partial<DayHours>) =>
    setForm(p => ({ ...p, hours: p.hours.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));

  const copyMondayToWeekdays = () =>
    setForm(p => ({ ...p, hours: p.hours.map((d, j) => (j >= 1 && j <= 4 ? { ...p.hours[0] } : d)) }));

  const handleUpload = async (kind: "logo" | "cover", file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Fotoja është shumë e madhe (maksimumi 5 MB)."); return; }
    setUploading(kind); setError("");
    try {
      const url = await uploadImage(file, kind === "logo" ? "nearbuy/logos" : "nearbuy/covers");
      set(kind === "logo" ? "logo" : "coverImage", url);
    } catch (e) { console.error(e); setError("Fotoja nuk u ngarkua. Provo përsëri."); }
    finally { setUploading(""); }
  };

  const useGps = () => {
    if (!navigator.geolocation) { alert("GPS nuk suportohet nga ky browser."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setForm(p => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => alert("Nuk u mor lokacioni. Lejo aksesin te GPS, ose ngjit linkun nga Google Maps.")
    );
  };

  const parseMapUrl = (val: string) => {
    const m = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
              val.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
              val.match(/mlat=(-?\d+\.\d+)&mlon=(-?\d+\.\d+)/) ||
              val.match(/(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,2}\.\d{3,})/);
    if (m) setForm(p => ({ ...p, lat: parseFloat(m[1]), lng: parseFloat(m[2]) }));
  };

  // ── Sa i plotë është profili ─────────────────────────────────────────────
  const checks: { label: string; done: boolean }[] = [
    { label: "Logo", done: !!form.logo },
    { label: "Foto kryesore e dyqanit", done: !!form.coverImage },
    { label: "Orari i punës", done: hasSavedHours },
    { label: "Pika në hartë", done: form.lat !== null },
    { label: "WhatsApp", done: form.whatsappSame ? !!normalizeWhatsApp(form.phone) : !!normalizeWhatsApp(form.whatsapp) },
    { label: "Përshkrim (të paktën 80 shkronja)", done: form.description.trim().length >= 80 },
    { label: "Mënyrat e pagesës", done: form.payments.length > 0 },
  ];
  const percent = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  const handleSave = async () => {
    if (!user || !docId) return;
    if (!form.name.trim() || form.categories.length === 0 || !form.city || !form.address.trim() || !form.phone.trim()) {
      setError("Plotëso të gjitha fushat e detyrueshme (*) dhe zgjidh të paktën një kategori.");
      return;
    }
    if (!normalizeWhatsApp(form.phone)) { setError("Numri i telefonit nuk duket i saktë."); return; }
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "businesses", docId), {
        name: form.name.trim(),
        categories: form.categories,
        category: form.categories[0],
        city: form.city,
        address: form.address.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsappSame ? form.phone.trim() : form.whatsapp.trim(),
        description: form.description.trim(),
        lat: form.lat,
        lng: form.lng,
        logo: form.logo,
        coverImage: form.coverImage,
        hours: form.hours,
        schedule: hoursToSchedule(form.hours),
        delivery: form.delivery,
        deliveryNote: form.delivery ? form.deliveryNote.trim() : "",
        payments: form.payments,
        facebook: form.facebook.trim(),
        instagram: form.instagram.trim(),
      });
      setHasSavedHours(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      setError("Gabim gjatë ruajtjes. Provo përsëri.");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const txt = (k: "name" | "address" | "phone" | "whatsapp" | "description" | "deliveryNote" | "facebook" | "instagram" | "city") =>
    (e: { target: { value: string } }) => set(k, e.target.value);

  return (
    <div className="pf-root">
      <div className="pf-header">
        <div>
          <h1 className="pf-title">Profili i dyqanit</h1>
          <p className="pf-sub">Kjo është ajo që shohin klientët kur hapin dyqanin tënd</p>
        </div>
        {docId && <Link href={`/business/${docId}`} target="_blank" className="pf-preview">👁 Shiko profilin publik</Link>}
      </div>

      {/* Plotësimi */}
      <div className="pf-card pf-progress">
        <div className="pf-progress-top">
          <span>Profili është <b>{percent}%</b> i plotë</span>
          {percent === 100 && <span className="pf-done">✓ Gati</span>}
        </div>
        <div className="pf-bar"><div style={{ width: `${percent}%` }} /></div>
        {percent < 100 && (
          <p className="pf-missing">Mungon: {checks.filter(c => !c.done).map(c => c.label).join(" · ")}</p>
        )}
        <p className="pf-hint">Profilet e plota marrin shumë më tepër telefonata — klientët i besojnë një dyqani me foto, orar dhe vendndodhje.</p>
      </div>

      <div className="pf-card">
        <h2 className="pf-section">Fotot</h2>
        <div className="pf-photos">
          <div className="pf-photo-box">
            <span className="pf-label">Logo</span>
            <label className="pf-logo">
              {form.logo ? <img src={form.logo} alt="logo" /> : <span>{uploading === "logo" ? "..." : "＋"}</span>}
              <input type="file" accept="image/*" hidden onChange={e => handleUpload("logo", e.target.files?.[0])} />
            </label>
          </div>
          <div className="pf-photo-box pf-photo-wide">
            <span className="pf-label">Foto kryesore (dyqani nga jashtë ose brenda)</span>
            <label className="pf-cover">
              {form.coverImage ? <img src={form.coverImage} alt="cover" /> : <span>{uploading === "cover" ? "Duke ngarkuar..." : "＋ Shto foto"}</span>}
              <input type="file" accept="image/*" hidden onChange={e => handleUpload("cover", e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </div>

      <div className="pf-card">
        <h2 className="pf-section">Të dhënat bazë</h2>
        <div className="pf-fields">
          <div className="pf-field">
            <label>Emri i dyqanit <span className="req">*</span></label>
            <input type="text" value={form.name} onChange={txt("name")} placeholder="p.sh. Elektronika ABC" />
          </div>

          <div className="pf-field">
            <label>Kategoritë <span className="req">*</span></label>
            <div className="pf-chips">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => toggleIn("categories", cat)}
                  className={`pf-chip ${form.categories.includes(cat) ? "active" : ""}`}>
                  {form.categories.includes(cat) ? "✓ " : ""}{cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-row">
            <div className="pf-field">
              <label>Qyteti <span className="req">*</span></label>
              <select value={form.city} onChange={txt("city")}>
                <option value="">Zgjidh...</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>Adresa <span className="req">*</span></label>
              <input type="text" value={form.address} onChange={txt("address")} placeholder="Rruga, Lagjja, Nr." />
            </div>
          </div>

          <div className="pf-field">
            <label>Përshkrim <span className="pf-opt">({form.description.trim().length} shkronja)</span></label>
            <textarea rows={4} value={form.description} onChange={txt("description")} placeholder={DESC_EXAMPLE} />
            <p className="pf-hint">Shkruaj çfarë shet, prej kur je në treg dhe çfarë të dallon (transport, çmime shumicë, këshilla).</p>
          </div>
        </div>
      </div>

      <div className="pf-card">
        <h2 className="pf-section">Kontakti</h2>
        <div className="pf-fields">
          <div className="pf-row">
            <div className="pf-field">
              <label>Telefoni <span className="req">*</span></label>
              <input type="tel" value={form.phone} onChange={txt("phone")} placeholder="068 123 4567" />
            </div>
            <div className="pf-field">
              <label>WhatsApp</label>
              <label className="pf-check">
                <input type="checkbox" checked={form.whatsappSame} onChange={e => set("whatsappSame", e.target.checked)} />
                I njëjti me telefonin
              </label>
              {!form.whatsappSame && (
                <input type="tel" value={form.whatsapp} onChange={txt("whatsapp")} placeholder="069 123 4567" />
              )}
            </div>
          </div>
          <p className="pf-hint">Klientët do të shohin butonin "Shkruaj në WhatsApp" me emrin e produktit që po shohin.</p>
          <div className="pf-row">
            <div className="pf-field">
              <label>Facebook <span className="pf-opt">(opsional)</span></label>
              <input type="text" value={form.facebook} onChange={txt("facebook")} placeholder="facebook.com/dyqaniyt" />
            </div>
            <div className="pf-field">
              <label>Instagram <span className="pf-opt">(opsional)</span></label>
              <input type="text" value={form.instagram} onChange={txt("instagram")} placeholder="@dyqaniyt" />
            </div>
          </div>
        </div>
      </div>

      <div className="pf-card">
        <div className="pf-section-row">
          <h2 className="pf-section">Orari i punës</h2>
          <button type="button" className="pf-link" onClick={copyMondayToWeekdays}>Kopjo të hënën te e martë–e premte</button>
        </div>
        <div className="pf-hours">
          {form.hours.map((d, i) => (
            <div key={i} className={`pf-hour-row ${d.closed ? "closed" : ""}`}>
              <span className="pf-day">{DAYS[i]}</span>
              {d.closed ? <span className="pf-closed-txt">Mbyllur</span> : (
                <span className="pf-times">
                  <input type="time" value={d.open} onChange={e => setDay(i, { open: e.target.value })} />
                  <span>–</span>
                  <input type="time" value={d.close} onChange={e => setDay(i, { close: e.target.value })} />
                </span>
              )}
              <label className="pf-check pf-check-sm">
                <input type="checkbox" checked={d.closed} onChange={e => setDay(i, { closed: e.target.checked })} />
                Mbyllur
              </label>
            </div>
          ))}
        </div>
        {!hasSavedHours && <p className="pf-hint">Ky është një orar i sugjeruar — ndryshoje dhe kliko "Ruaj" që të shfaqet te klientët.</p>}
      </div>

      <div className="pf-card">
        <h2 className="pf-section">Vendndodhja në hartë</h2>
        <div className="pf-map-wrap">
          {form.lat !== null && form.lng !== null && (
            <iframe
              key={`${form.lat}-${form.lng}`}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.lng - 0.005}%2C${form.lat - 0.005}%2C${form.lng + 0.005}%2C${form.lat + 0.005}&layer=mapnik&marker=${form.lat}%2C${form.lng}`}
              style={{ width: "100%", height: "200px", border: "none", borderRadius: "10px" }}
              title="Harta"
            />
          )}
          <button type="button" className="pf-gps-btn" onClick={useGps}>📍 Përdor lokacionin tim tani (kur je në dyqan)</button>
          <input type="text" className="pf-url-input" onChange={e => parseMapUrl(e.target.value)}
            placeholder="Ose ngjit linkun e dyqanit nga Google Maps..." />
          {form.lat !== null
            ? <p className="pf-coords-show">✓ Pika u vendos. Kontrollo në hartë që është saktë te dyqani.</p>
            : <p className="pf-hint">Pa pikë në hartë, butoni "Hap në Maps" kërkon vetëm sipas emrit dhe shpesh nuk e gjen dyqanin.</p>}
        </div>
      </div>

      <div className="pf-card">
        <h2 className="pf-section">Shërbimet</h2>
        <div className="pf-fields">
          <div className="pf-field">
            <label className="pf-check">
              <input type="checkbox" checked={form.delivery} onChange={e => set("delivery", e.target.checked)} />
              Ofrojmë transport / dërgesë
            </label>
            {form.delivery && (
              <input type="text" value={form.deliveryNote} onChange={txt("deliveryNote")}
                placeholder="p.sh. Falas në Durrës për porosi mbi 10,000 L" />
            )}
          </div>
          <div className="pf-field">
            <label>Mënyrat e pagesës</label>
            <div className="pf-chips">
              {PAYMENT_OPTIONS.map(p => (
                <button key={p} type="button" onClick={() => toggleIn("payments", p)}
                  className={`pf-chip ${form.payments.includes(p) ? "active" : ""}`}>
                  {form.payments.includes(p) ? "✓ " : ""}{p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="pf-error">{error}</div>}
      {saved && <div className="pf-success">✓ Ndryshimet u ruajtën me sukses!</div>}

      <button onClick={handleSave} disabled={saving || uploading !== ""} className="pf-btn">
        {saving ? <><span className="nb-spin nb-spin-w" /> Duke ruajtur...</> : "Ruaj ndryshimet"}
      </button>

      <style>{`
        .pf-root{display:flex;flex-direction:column;gap:1rem;max-width:680px;padding-bottom:2rem}
        .pf-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap}
        .pf-title{font-size:1.3rem;font-weight:700;color:#f4f4f5;letter-spacing:-0.02em}
        .pf-sub{font-size:0.82rem;color:#71717a;margin-top:2px}
        .pf-preview{font-size:0.82rem;color:#f97316;text-decoration:none;border:1px solid rgba(249,115,22,0.3);border-radius:10px;padding:0.5rem 0.9rem;white-space:nowrap}
        .pf-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:1.25rem;display:flex;flex-direction:column;gap:12px}
        .pf-section{font-size:0.95rem;font-weight:700;color:#e4e4e7}
        .pf-section-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
        .pf-progress-top{display:flex;justify-content:space-between;font-size:0.88rem;color:#a1a1aa}
        .pf-progress-top b{color:#f97316}
        .pf-done{color:#22c55e;font-weight:600}
        .pf-bar{height:8px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden}
        .pf-bar div{height:100%;background:linear-gradient(90deg,#f97316,#f5c842);border-radius:999px;transition:width .3s}
        .pf-missing{font-size:0.8rem;color:#f5c842}
        .pf-hint{font-size:0.76rem;color:#71717a;line-height:1.5}
        .pf-fields{display:flex;flex-direction:column;gap:1rem}
        .pf-field{display:flex;flex-direction:column;gap:0.4rem}
        .pf-field > label,.pf-label{font-size:0.78rem;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.02em}
        .req{color:#f97316}
        .pf-opt{color:#52525b;font-weight:400;text-transform:none;font-size:0.75rem}
        .pf-field input,.pf-field select,.pf-field textarea,.pf-url-input{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;padding:0.7rem 0.9rem;outline:none;font-family:inherit;resize:vertical}
        .pf-field input:focus,.pf-field select:focus,.pf-field textarea:focus,.pf-url-input:focus{border-color:rgba(249,115,22,0.5)}
        .pf-field input::placeholder,.pf-field textarea::placeholder,.pf-url-input::placeholder{color:#52525b}
        .pf-field select option{background:#1c1c1c}
        .pf-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .pf-chips{display:flex;flex-wrap:wrap;gap:8px}
        .pf-chip{padding:0.5rem 0.9rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#a1a1aa;font-size:0.84rem;cursor:pointer;font-family:inherit}
        .pf-chip.active{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.4);color:#f97316;font-weight:600}
        .pf-check{display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#d4d4d8;cursor:pointer;text-transform:none!important;letter-spacing:0!important;font-weight:500!important}
        .pf-check input{accent-color:#f97316;width:16px;height:16px}
        .pf-check-sm{font-size:0.78rem;color:#71717a}
        .pf-photos{display:flex;gap:12px;flex-wrap:wrap}
        .pf-photo-box{display:flex;flex-direction:column;gap:6px}
        .pf-photo-wide{flex:1;min-width:220px}
        .pf-logo{width:96px;height:96px;border-radius:16px;border:1.5px dashed rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;color:#71717a;font-size:1.4rem}
        .pf-logo img,.pf-cover img{width:100%;height:100%;object-fit:cover}
        .pf-cover{height:96px;border-radius:16px;border:1.5px dashed rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;color:#71717a;font-size:0.85rem}
        .pf-logo:hover,.pf-cover:hover{border-color:rgba(249,115,22,0.5)}
        .pf-hours{display:flex;flex-direction:column;gap:6px}
        .pf-hour-row{display:grid;grid-template-columns:100px 1fr auto;align-items:center;gap:10px;padding:0.4rem 0.6rem;border-radius:8px;background:rgba(255,255,255,0.02)}
        .pf-hour-row.closed{opacity:0.6}
        .pf-day{font-size:0.85rem;color:#e4e4e7;font-weight:500}
        .pf-times{display:flex;align-items:center;gap:6px;color:#71717a}
        .pf-times input{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f4f4f5;font-size:0.84rem;padding:0.35rem 0.5rem;font-family:inherit;color-scheme:dark}
        .pf-closed-txt{font-size:0.82rem;color:#71717a}
        .pf-link{background:none;border:none;color:#f97316;font-size:0.78rem;cursor:pointer;font-family:inherit;text-decoration:underline}
        .pf-map-wrap{display:flex;flex-direction:column;gap:8px}
        .pf-gps-btn{padding:0.65rem 1rem;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:10px;color:#f97316;font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;text-align:left}
        .pf-coords-show{font-size:0.78rem;color:#22c55e}
        .pf-error{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;font-size:0.85rem;border-radius:10px;padding:0.65rem 0.9rem}
        .pf-success{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);color:#22c55e;font-size:0.85rem;border-radius:10px;padding:0.65rem 0.9rem}
        .pf-btn{width:100%;padding:0.8rem;background:#f97316;color:white;border:none;border-radius:12px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;position:sticky;bottom:12px;box-shadow:0 6px 20px rgba(0,0,0,0.4)}
        .pf-btn:hover:not(:disabled){background:#ea6c0a}
        .pf-btn:disabled{opacity:0.5;cursor:not-allowed}
        .nb-spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,0.25);border-top-color:currentColor;border-radius:50%;animation:spin 0.65s linear infinite}
        .nb-spin-w{border-color:rgba(255,255,255,0.25);border-top-color:white}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:520px){.pf-row{grid-template-columns:1fr}.pf-hour-row{grid-template-columns:1fr auto}.pf-times{grid-column:1/-1;order:3}}
      `}</style>
    </div>
  );
}
