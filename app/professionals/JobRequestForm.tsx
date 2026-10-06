"use client";

// "Kërko mjeshtër" — klienti përshkruan punën dhe kërkesa u shkon mjeshtrave të zonës.

import { useState } from "react";
import { PROFESSIONS } from "@/lib/proPlans";
import { submitJobRequest, URGENCY } from "@/lib/jobRequests";
import { CITIES, normalizePhone, PHONE_ERROR, EXPIRY_DAYS } from "@/lib/requestRules";

export default function JobRequestForm({ defaultProfession = "", defaultCity = "", onClose }: {
  defaultProfession?: string; defaultCity?: string; onClose?: () => void;
}) {
  const [f, setF] = useState({ profession: defaultProfession, city: defaultCity, description: "", urgency: URGENCY[1], name: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // fushë e fshehur kundër robotëve
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<number | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!f.profession || !f.city) { setError("Zgjidh llojin e mjeshtrit dhe qytetin."); return; }
    if (f.description.trim().length < 10) { setError("Përshkruaj shkurt punën (të paktën 10 shkronja)."); return; }
    if (!f.name.trim()) { setError("Shkruaj emrin."); return; }
    if (!normalizePhone(f.phone)) { setError(PHONE_ERROR); return; }
    if (!consent) { setError("Duhet të pranosh që mjeshtrat të të kontaktojnë."); return; }
    setBusy(true);
    try { setSent(await submitJobRequest({ ...f, consent, website })); }
    catch (e) { console.error(e); setError(e instanceof Error && e.message ? e.message : "Kërkesa nuk u dërgua. Provo përsëri pas pak."); }
    finally { setBusy(false); }
  };

  if (sent !== null) return (
    <div className="jr jr-done">
      <p style={{ fontSize: "2rem" }}>✅</p>
      <p className="jr-title">Kërkesa u dërgua!</p>
      <p className="jr-text">
        {sent > 0
          ? `E dërguam te ${sent} ${f.profession.toLowerCase()} në ${f.city}. Do të të kontaktojnë në telefon ose WhatsApp.`
          : `Për momentin s'ka mjeshtër partnerë për këtë punë në ${f.city}. Kërkesa u ruajt dhe do të të kontaktojmë sapo ta gjejmë.`}
      </p>
      <p className="jr-small">
        Kërkesa mbetet aktive {EXPIRY_DAYS.job} ditë. Nëse gjen mjeshtër më herët, herën tjetër që hap NearBuy nga ky telefon
        mund ta mbyllësh me një klik, që të mos të telefonojnë më.
      </p>
      {onClose && <button className="jr-sec" onClick={onClose}>Mbyll</button>}
      <style>{CSS}</style>
    </div>
  );

  return (
    <div className="jr">
      <p className="jr-title">Kërko mjeshtër</p>
      <p className="jr-text">Përshkruaj punën dhe mjeshtrat e zonës tënde do të të kontaktojnë. Falas, pa detyrim.</p>
      <div className="jr-grid">
        <select value={f.profession} onChange={set("profession")}>
          <option value="">Çfarë mjeshtri të duhet?</option>
          {PROFESSIONS.filter(p => p !== "Tjetër").map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={f.city} onChange={set("city")}>
          <option value="">Qyteti</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <textarea rows={3} maxLength={800} value={f.description} onChange={set("description")}
        placeholder="p.sh. Më rrjedh uji nga bojleri në banjë, duhet riparim sot." />
      <div className="jr-urg">
        {URGENCY.map(u => (
          <button key={u} type="button" className={f.urgency === u ? "on" : ""} onClick={() => setF(p => ({ ...p, urgency: u }))}>{u}</button>
        ))}
      </div>
      <div className="jr-grid">
        <input placeholder="Emri" maxLength={80} value={f.name} onChange={set("name")} />
        <input placeholder="Telefoni / WhatsApp" type="tel" maxLength={30} value={f.phone} onChange={set("phone")} />
      </div>
      <label className="jr-consent">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        Pranoj që emri dhe numri im t&apos;u jepen mjeshtrave në NearBuy që bëjnë këtë punë, që të më kontaktojnë vetëm për këtë kërkesë.
      </label>
      <input className="jr-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" placeholder="Website"
        value={website} onChange={e => setWebsite(e.target.value)} />
      {error && <p className="jr-err">{error}</p>}
      <div className="jr-actions">
        {onClose && <button className="jr-sec" onClick={onClose}>Anulo</button>}
        <button className="jr-btn" disabled={busy} onClick={submit}>{busy ? "Duke dërguar..." : "Dërgo kërkesën"}</button>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  .jr{background:#121212;border:1px solid rgba(192,132,252,0.3);border-radius:16px;padding:1.25rem;display:flex;flex-direction:column;gap:10px}
  .jr-done{align-items:center;text-align:center}
  .jr-title{font-size:1.05rem;font-weight:700;color:#c084fc}
  .jr-text{font-size:0.86rem;color:#a1a1aa;line-height:1.5}
  .jr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .jr input,.jr select,.jr textarea{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f4f4f5;font-size:0.9rem;padding:0.7rem 0.8rem;font-family:inherit;outline:none;resize:vertical}
  .jr select option{background:#1c1c1c}
  .jr input:focus,.jr select:focus,.jr textarea:focus{border-color:rgba(192,132,252,0.5)}
  .jr-urg{display:flex;gap:6px;flex-wrap:wrap}
  .jr-urg button{padding:0.4rem 0.8rem;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:#a1a1aa;font-size:0.8rem;cursor:pointer;font-family:inherit}
  .jr-urg button.on{background:rgba(192,132,252,0.15);border-color:rgba(192,132,252,0.4);color:#c084fc}
  .jr-consent{display:flex;gap:8px;align-items:flex-start;font-size:0.8rem;color:#a1a1aa;cursor:pointer}
  .jr-consent input{accent-color:#c084fc;margin-top:2px}
  .jr-err{font-size:0.82rem;color:#f87171}
  .jr-small{font-size:0.78rem;color:#71717a;line-height:1.5}
  .jr-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
  .jr-actions{display:flex;gap:8px;justify-content:flex-end}
  .jr-btn{padding:0.7rem 1.4rem;background:#c084fc;color:#111;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit}
  .jr-btn:disabled{opacity:0.6}
  .jr-sec{padding:0.7rem 1.1rem;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#a1a1aa;border-radius:10px;cursor:pointer;font-family:inherit}
  @media(max-width:560px){.jr-grid{grid-template-columns:1fr}}
`;
