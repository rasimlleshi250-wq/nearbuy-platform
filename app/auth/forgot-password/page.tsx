"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        setSent(true); // Për siguri, mos trego nëse email ekziston
      } else if (code === "auth/too-many-requests") {
        setError("Shumë tentativa. Provo përsëri pas pak minutash.");
      } else {
        setError("Diçka shkoi gabim. Provo përsëri.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="nb-root">
      <div className="nb-blob nb-blob-a" />
      <div className="nb-blob nb-blob-b" />
      <div className="nb-grid" />

      <div className="nb-card">
        <Link href="/" className="nb-brand">
          <div className="nb-logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
              <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
            </svg>
          </div>
          <span>NearBuy<em>.al</em></span>
        </Link>

        {sent ? (
          <div className="nb-success">
            <div className="nb-success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>
            </div>
            <h1>Email-i u dërgua!</h1>
            <p>Nëse <strong>{email}</strong> është i regjistruar, do të marrësh udhëzime për rivendosjen e fjalëkalimit.</p>
            <p className="nb-success-note">Kontrollo edhe dosjen <em>Spam</em> nëse nuk e sheh emailin brenda 5 minutave.</p>
            <div className="nb-success-actions">
              <button onClick={() => { setSent(false); setEmail(""); }} className="nb-btn-outline" type="button">Provo email tjetër</button>
              <Link href="/auth/login" className="nb-btn-primary">Kthehu tek hyrja</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="nb-header">
              <div className="nb-header-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/><circle cx="12" cy="16" r="1" fill="#f97316" stroke="none"/></svg>
              </div>
              <h1>Rivendos fjalëkalimin</h1>
              <p>Shkruaj emailin tënd dhe do të të dërgojmë udhëzime.</p>
            </div>

            <form onSubmit={handleSubmit} className="nb-form">
              <div className="nb-field">
                <label htmlFor="email">Email</label>
                <div className="nb-input-wrap">
                  <svg className="nb-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                  <input id="email" type="email" autoComplete="email" required placeholder="emri@shembull.al" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                </div>
              </div>

              {error && (
                <div className="nb-error">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="nb-btn-primary">
                {loading && <span className="nb-spin" />}
                {loading ? "Duke dërguar…" : "Dërgo udhëzimet"}
              </button>
            </form>

            <Link href="/auth/login" className="nb-back-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Kthehu tek hyrja
            </Link>
          </>
        )}
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .nb-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; position: relative; overflow: hidden; }
        .nb-blob { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; z-index: 0; }
        .nb-blob-a { width: 450px; height: 450px; background: radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%); top: -120px; right: -80px; }
        .nb-blob-b { width: 340px; height: 340px; background: radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%); bottom: -80px; left: -60px; }
        .nb-grid { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px; }
        .nb-card { position: relative; z-index: 1; background: rgba(20,20,20,0.97); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 2.5rem 2.25rem; width: 100%; max-width: 420px; box-shadow: 0 0 0 1px rgba(249,115,22,0.04), 0 25px 60px rgba(0,0,0,0.6); animation: up 0.45s cubic-bezier(.22,.68,0,1.15) both; }
        @keyframes up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .nb-brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 2rem; }
        .nb-logo-mark { width: 38px; height: 38px; border-radius: 10px; background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.2); display: flex; align-items: center; justify-content: center; }
        .nb-brand span { font-size: 1.15rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .nb-brand em { color: #f97316; font-style: normal; }
        .nb-header { margin-bottom: 1.75rem; }
        .nb-header-icon { width: 50px; height: 50px; border-radius: 13px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
        .nb-header h1 { font-size: 1.55rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; margin-bottom: 0.4rem; }
        .nb-header p { color: #71717a; font-size: 0.875rem; line-height: 1.5; }
        .nb-form { display: flex; flex-direction: column; gap: 1rem; }
        .nb-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .nb-field label { font-size: 0.8rem; font-weight: 600; color: #a1a1aa; letter-spacing: 0.02em; text-transform: uppercase; }
        .nb-input-wrap { position: relative; display: flex; align-items: center; }
        .nb-icon { position: absolute; left: 12px; color: #52525b; pointer-events: none; }
        .nb-input-wrap input { width: 100%; padding: 0.72rem 0.9rem 0.72rem 2.4rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; color: #f4f4f5; font-size: 0.875rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; font-family: inherit; }
        .nb-input-wrap input::placeholder { color: #3f3f46; }
        .nb-input-wrap input:focus { border-color: rgba(249,115,22,0.5); background: rgba(249,115,22,0.04); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .nb-error { display: flex; align-items: center; gap: 8px; background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.2); color: #f87171; font-size: 0.82rem; border-radius: 10px; padding: 0.6rem 0.8rem; }
        .nb-btn-primary { width: 100%; padding: 0.78rem 1rem; background: #f97316; color: white; font-size: 0.9rem; font-weight: 600; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; font-family: inherit; box-shadow: 0 4px 20px rgba(249,115,22,0.3); text-decoration: none; }
        .nb-btn-primary:hover:not(:disabled) { background: #ea6c0a; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(249,115,22,0.4); }
        .nb-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .nb-spin { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.65s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .nb-back-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 1.5rem; color: #71717a; font-size: 0.85rem; text-decoration: none; transition: color 0.2s; }
        .nb-back-link:hover { color: #f97316; }
        .nb-success { text-align: center; }
        .nb-success-icon { width: 70px; height: 70px; border-radius: 18px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; animation: pop 0.5s cubic-bezier(.22,.68,0,1.4) both; }
        @keyframes pop { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
        .nb-success h1 { font-size: 1.55rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; margin-bottom: 0.75rem; }
        .nb-success p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.6; margin-bottom: 0.5rem; }
        .nb-success p strong { color: #e4e4e7; }
        .nb-success-note { color: #52525b !important; font-size: 0.8rem !important; }
        .nb-success-note em { font-style: normal; color: #71717a; }
        .nb-success-actions { display: flex; gap: 10px; margin-top: 1.75rem; }
        .nb-btn-outline { flex: 1; padding: 0.72rem; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #a1a1aa; border-radius: 12px; font-size: 0.875rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: border-color 0.2s, color 0.2s; }
        .nb-btn-outline:hover { border-color: rgba(255,255,255,0.2); color: #e4e4e7; }
        @media (max-width: 480px) { .nb-card { padding: 2rem 1.5rem; } }
      `}</style>
    </main>
  );
}
