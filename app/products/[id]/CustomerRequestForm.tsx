"use client";

// Forma "Ke nevojë për këtë produkt?" — shfaqet kur asnjë dyqan nuk e shet produktin.

import { useState } from "react";
import { submitCustomerRequest, CITIES } from "@/lib/leads";

interface Props {
  productId: string;
  productName: string;
  category: string;
}

export default function CustomerRequestForm({ productId, productName, category }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", city: "", note: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<number | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!form.name.trim() || !form.city) { setError("Shkruaj emrin dhe zgjidh qytetin."); return; }
    if (form.phone.replace(/\D/g, "").length < 8) { setError("Shkruaj një numër telefoni të saktë."); return; }
    if (!consent) { setError("Duhet të pranosh që dyqanet të të kontaktojnë."); return; }
    setBusy(true);
    try {
      const n = await submitCustomerRequest({ productId, productName, category, ...form });
      setSent(n);
    } catch (e) {
      console.error(e);
      setError("Kërkesa nuk u dërgua. Provo përsëri pas pak.");
    } finally { setBusy(false); }
  };

  if (sent !== null) {
    return (
      <div className="crf crf-done">
        <p className="crf-icon">✅</p>
        <p className="crf-title">Kërkesa u dërgua!</p>
        <p className="crf-text">
          {sent > 0
            ? `E dërguam te ${sent} ${sent === 1 ? "dyqan" : "dyqane"} në ${form.city}. Do të të kontaktojnë në telefon ose WhatsApp.`
            : `Për momentin s'ka dyqane partnere në ${form.city} për këtë kategori. Kërkesa jote u ruajt dhe do të të kontaktojmë sapo ta gjejmë.`}
        </p>
        <style>{CSS}</style>
      </div>
    );
  }

  return (
    <div className="crf">
      <p className="crf-title">Ke nevojë për këtë produkt?</p>
      <p className="crf-text">Lër kërkesën dhe dyqanet në qytetin tënd do të të kontaktojnë me çmim dhe disponueshmëri. Falas, pa detyrim blerjeje.</p>
      <div className="crf-grid">
        <input placeholder="Emri" value={form.name} onChange={set("name")} maxLength={80} />
        <input placeholder="Telefoni / WhatsApp" type="tel" value={form.phone} onChange={set("phone")} maxLength={30} />
        <select value={form.city} onChange={set("city")}>
          <option value="">Qyteti</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Sasia ose shënim (opsional)" value={form.note} onChange={set("note")} maxLength={500} />
      </div>
      <label className="crf-consent">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        Pranoj që dyqanet në NearBuy të më kontaktojnë për këtë kërkesë.
      </label>
      {error && <p className="crf-error">{error}</p>}
      <button onClick={submit} disabled={busy} className="crf-btn">{busy ? "Duke dërguar..." : "Dërgo kërkesën"}</button>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  .crf{background:rgba(245,200,66,0.05);border:1px solid rgba(245,200,66,0.25);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:12px}
  .crf-done{align-items:center;text-align:center}
  .crf-icon{font-size:2rem}
  .crf-title{font-size:1.05rem;font-weight:700;color:#f5c842}
  .crf-text{font-size:0.88rem;color:#a1a1aa;line-height:1.5}
  .crf-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .crf-grid input,.crf-grid select{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f4f4f5;font-size:0.9rem;padding:0.7rem 0.8rem;font-family:inherit;outline:none}
  .crf-grid input:focus,.crf-grid select:focus{border-color:rgba(245,200,66,0.5)}
  .crf-grid select option{background:#1c1c1c}
  .crf-consent{display:flex;gap:8px;align-items:flex-start;font-size:0.8rem;color:#a1a1aa;cursor:pointer;line-height:1.4}
  .crf-consent input{accent-color:#f5c842;margin-top:2px}
  .crf-error{font-size:0.82rem;color:#f87171}
  .crf-btn{padding:0.75rem;background:#f5c842;color:#111;border:none;border-radius:10px;font-size:0.92rem;font-weight:700;cursor:pointer;font-family:inherit}
  .crf-btn:disabled{opacity:0.6}
  @media(max-width:520px){.crf-grid{grid-template-columns:1fr}}
`;
