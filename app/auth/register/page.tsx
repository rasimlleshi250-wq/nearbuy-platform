"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

type Role = "business" | "professional" | null;

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordStrength = (p: string) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = passwordStrength(password);
  const strengthLabel = ["", "E dobët", "Mesatare", "Mirë", "Shumë mirë"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e", "#16a34a"][strength];

  const createProfile = async (uid: string, email: string, displayName: string, selectedRole: Role) => {
    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      displayName,
      role: selectedRole,
      createdAt: serverTimestamp(),
    }, { merge: true });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setError("Zgjidh llojin e llogarisë."); return; }
    if (password !== confirmPassword) { setError("Fjalëkalimet nuk përputhen."); return; }
    if (password.length < 8) { setError("Fjalëkalimi duhet të ketë të paktën 8 karaktere."); return; }
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      await createProfile(cred.user.uid, email, name.trim(), role);
      router.push(role === "business" ? "/dashboard/business/setup" : "/dashboard/professional/setup");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") setError("Ky email është i regjistruar tashmë.");
      else if (code === "auth/weak-password") setError("Fjalëkalimi është shumë i dobët.");
      else setError("Diçka shkoi gabim. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!role) { setError("Zgjidh llojin e llogarisë para se të vazhdosh."); return; }
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await createProfile(cred.user.uid, cred.user.email || "", cred.user.displayName || "", role);
      router.push(role === "business" ? "/dashboard/business/setup" : "/dashboard/professional/setup");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user") setError("Hyrja me Google dështoi.");
    } finally {
      setGoogleLoading(false);
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

        <div className="nb-header">
          <h1>Krijo llogarinë</h1>
          <p>Zgjidh llojin e llogarisë për të vazhduar</p>
        </div>

        {/* Role Selection */}
        <div className="nb-role-grid">
          <button
            type="button"
            onClick={() => { setRole("business"); setError(""); }}
            className={`nb-role-card ${role === "business" ? "selected" : ""}`}
          >
            <span className="nb-role-icon">🏪</span>
            <span className="nb-role-title">Biznes</span>
            <span className="nb-role-desc">Listo produktet e dyqanit tënd</span>
            {role === "business" && <span className="nb-role-check">✓</span>}
          </button>

          <button
            type="button"
            onClick={() => { setRole("professional"); setError(""); }}
            className={`nb-role-card ${role === "professional" ? "selected" : ""}`}
          >
            <span className="nb-role-icon">👷</span>
            <span className="nb-role-title">Profesionist</span>
            <span className="nb-role-desc">Ofro shërbimet e tua</span>
            {role === "professional" && <span className="nb-role-check">✓</span>}
          </button>
        </div>

        {role && (
          <>
            <button onClick={handleGoogle} disabled={googleLoading || loading} className="nb-google-btn" type="button">
              {googleLoading ? <span className="nb-spin" /> : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
              )}
              <span>{googleLoading ? "Duke u lidhur…" : `Regjistrohu si ${role === "business" ? "Biznes" : "Profesionist"} me Google`}</span>
            </button>

            <div className="nb-divider"><span>ose me email</span></div>

            <form onSubmit={handleRegister} className="nb-form">
              <div className="nb-field">
                <label>Emri i plotë <span className="nb-req">*</span></label>
                <div className="nb-input-wrap">
                  <svg className="nb-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.582-7 8-7s8 3 8 7"/></svg>
                  <input type="text" autoComplete="name" required placeholder="Emri Mbiemri" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>

              <div className="nb-field">
                <label>Email <span className="nb-req">*</span></label>
                <div className="nb-input-wrap">
                  <svg className="nb-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                  <input type="email" autoComplete="email" required placeholder="emri@shembull.al" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="nb-field">
                <label>Fjalëkalimi <span className="nb-req">*</span></label>
                <div className="nb-input-wrap">
                  <svg className="nb-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type={showPassword ? "text" : "password"} autoComplete="new-password" required placeholder="Min. 8 karaktere" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="nb-eye" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {password && (
                  <div className="nb-strength">
                    <div className="nb-bars">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="nb-bar" style={{ background: i <= strength ? strengthColor : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    <span style={{ color: strengthColor, fontSize: '0.75rem', fontWeight: 600 }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div className="nb-field">
                <label>Konfirmo fjalëkalimin <span className="nb-req">*</span></label>
                <div className="nb-input-wrap">
                  <svg className="nb-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type={showPassword ? "text" : "password"} autoComplete="new-password" required placeholder="Përsërit fjalëkalimin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ borderColor: confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : '' }} />
                </div>
              </div>

              {error && (
                <div className="nb-error">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || googleLoading} className="nb-btn-primary">
                {loading && <span className="nb-spin nb-spin-w" />}
                {loading ? "Duke krijuar llogarinë…" : `Regjistrohu si ${role === "business" ? "Biznes" : "Profesionist"}`}
              </button>

              <p className="nb-terms">
                Duke u regjistruar, pranon <Link href="/terms">Kushtet e Shërbimit</Link> dhe <Link href="/privacy">Politikën e Privatësisë</Link>.
              </p>
            </form>
          </>
        )}

        <p className="nb-footer-cta">
          Ke llogari? <Link href="/auth/login">Hyr →</Link>
        </p>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .nb-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; position: relative; overflow: hidden; }
        .nb-blob { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; z-index: 0; }
        .nb-blob-a { width: 500px; height: 500px; background: radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%); top: -150px; right: -100px; }
        .nb-blob-b { width: 380px; height: 380px; background: radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%); bottom: -100px; left: -80px; }
        .nb-grid { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px; }
        .nb-card { position: relative; z-index: 1; background: rgba(20,20,20,0.97); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 2.5rem 2.25rem; width: 100%; max-width: 460px; box-shadow: 0 0 0 1px rgba(249,115,22,0.04), 0 25px 60px rgba(0,0,0,0.6); animation: up 0.45s cubic-bezier(.22,.68,0,1.15) both; }
        @keyframes up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .nb-brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 1.75rem; }
        .nb-logo-mark { width: 38px; height: 38px; border-radius: 10px; background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.2); display: flex; align-items: center; justify-content: center; }
        .nb-brand span { font-size: 1.15rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .nb-brand em { color: #f97316; font-style: normal; }
        .nb-header { margin-bottom: 1.5rem; }
        .nb-header h1 { font-size: 1.55rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; margin-bottom: 0.3rem; }
        .nb-header p { color: #71717a; font-size: 0.875rem; }

        /* Role Cards */
        .nb-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem; }
        .nb-role-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 1.25rem 1rem; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 14px; cursor: pointer; transition: all 0.2s; text-align: center; font-family: inherit; }
        .nb-role-card:hover { border-color: rgba(249,115,22,0.3); background: rgba(249,115,22,0.06); }
        .nb-role-card.selected { border-color: #f97316; background: rgba(249,115,22,0.1); }
        .nb-role-icon { font-size: 1.75rem; }
        .nb-role-title { font-size: 0.9rem; font-weight: 700; color: #e4e4e7; }
        .nb-role-desc { font-size: 0.72rem; color: #71717a; line-height: 1.4; }
        .nb-role-check { position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; background: #f97316; border-radius: 50%; font-size: 0.65rem; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; }

        .nb-google-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0.72rem 1rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #e4e4e7; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.2s, border-color 0.2s; font-family: inherit; }
        .nb-google-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
        .nb-google-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .nb-divider { display: flex; align-items: center; gap: 12px; margin: 1.25rem 0; color: #52525b; font-size: 0.78rem; }
        .nb-divider::before, .nb-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .nb-form { display: flex; flex-direction: column; gap: 0.9rem; }
        .nb-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .nb-field label { font-size: 0.8rem; font-weight: 600; color: #a1a1aa; letter-spacing: 0.02em; text-transform: uppercase; }
        .nb-req { color: #f97316; }
        .nb-input-wrap { position: relative; display: flex; align-items: center; }
        .nb-icon { position: absolute; left: 12px; color: #52525b; pointer-events: none; }
        .nb-input-wrap input { width: 100%; padding: 0.7rem 0.9rem 0.7rem 2.4rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; color: #f4f4f5; font-size: 0.875rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; }
        .nb-input-wrap input::placeholder { color: #3f3f46; }
        .nb-input-wrap input:focus { border-color: rgba(249,115,22,0.5); background: rgba(249,115,22,0.04); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .nb-eye { position: absolute; right: 12px; background: none; border: none; cursor: pointer; color: #52525b; display: flex; align-items: center; padding: 0; transition: color 0.2s; }
        .nb-eye:hover { color: #a1a1aa; }
        .nb-strength { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
        .nb-bars { display: flex; gap: 4px; }
        .nb-bar { height: 3px; width: 36px; border-radius: 2px; transition: background 0.3s; }
        .nb-error { display: flex; align-items: center; gap: 8px; background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.2); color: #f87171; font-size: 0.82rem; border-radius: 10px; padding: 0.6rem 0.8rem; }
        .nb-btn-primary { width: 100%; padding: 0.78rem 1rem; background: #f97316; color: white; font-size: 0.9rem; font-weight: 600; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s, transform 0.15s; margin-top: 0.25rem; font-family: inherit; box-shadow: 0 4px 20px rgba(249,115,22,0.3); }
        .nb-btn-primary:hover:not(:disabled) { background: #ea6c0a; transform: translateY(-1px); }
        .nb-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .nb-terms { font-size: 0.75rem; color: #52525b; text-align: center; line-height: 1.5; }
        .nb-terms a { color: #71717a; text-decoration: underline; }
        .nb-spin { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.25); border-top-color: currentColor; border-radius: 50%; animation: spin 0.65s linear infinite; }
        .nb-spin-w { border-color: rgba(255,255,255,0.25); border-top-color: white; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .nb-footer-cta { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: #52525b; }
        .nb-footer-cta a { color: #f97316; font-weight: 600; text-decoration: none; }
        .nb-footer-cta a:hover { text-decoration: underline; }
        @media (max-width: 480px) { .nb-card { padding: 2rem 1.5rem; } }
      `}</style>
    </main>
  );
}
