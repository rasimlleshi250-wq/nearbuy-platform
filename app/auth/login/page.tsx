"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const getRedirectPath = async (uid: string): Promise<string> => {
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) return "/";
      const role = userSnap.data().role;

      if (role === "admin") return "/admin";

      if (role === "business") {
        const bizSnap = await getDoc(doc(db, "businesses", uid));
        if (bizSnap.exists()) return "/dashboard/business";
        return "/dashboard/business/setup";
      }

      if (role === "professional") {
        const proSnap = await getDoc(doc(db, "professionals", uid));
        if (proSnap.exists()) return "/dashboard/professional";
        return "/dashboard/professional/setup";
      }

      return "/";
    } catch {
      return "/";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Plotëso të gjitha fushat."); return; }
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const path = await getRedirectPath(cred.user.uid);
      router.push(path);
    } catch (err: any) {
      const code = err.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Email ose fjalëkalim i gabuar.");
      } else if (code === "auth/too-many-requests") {
        setError("Shumë tentativa. Provo përsëri pas pak minutash.");
      } else {
        setError("Ndodhi një gabim. Provo përsëri.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-glow" />
      <div className="auth-card">
        <Link href="/" className="auth-logo">Near<span>Buy</span>.al</Link>

        <div className="auth-header">
          <h1>Mirë se u ktheve</h1>
          <p>Hyr në llogarinë tënde</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="emri@email.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label>Fjalëkalimi</label>
              <Link href="/auth/forgot-password" className="auth-forgot">Harrove?</Link>
            </div>
            <div className="auth-pass-wrap">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="auth-eye">
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? (
              <><span className="auth-spin" /> Duke hyrë...</>
            ) : "Hyr"}
          </button>
        </form>

        <p className="auth-footer">
          Nuk ke llogari?{" "}
          <Link href="/auth/register" className="auth-link">Regjistrohu</Link>
        </p>
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .auth-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:2rem;position:relative}
        .auth-glow{position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 30%,rgba(249,115,22,0.06),transparent 70%);pointer-events:none}
        .auth-card{position:relative;z-index:1;width:100%;max-width:420px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:2rem}
        .auth-logo{display:block;font-size:1.15rem;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.02em;margin-bottom:1.75rem;text-align:center}
        .auth-logo span{color:#f97316}
        .auth-header{text-align:center;margin-bottom:1.75rem}
        .auth-header h1{font-size:1.4rem;font-weight:700;color:#f4f4f5;letter-spacing:-0.025em;margin-bottom:4px}
        .auth-header p{font-size:0.875rem;color:#71717a}
        .auth-form{display:flex;flex-direction:column;gap:1rem}
        .auth-field{display:flex;flex-direction:column;gap:0.4rem}
        .auth-field label{font-size:0.78rem;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.02em}
        .auth-field input{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.9rem;padding:0.75rem 1rem;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;width:100%}
        .auth-field input:focus{border-color:rgba(249,115,22,0.5);box-shadow:0 0 0 3px rgba(249,115,22,0.1)}
        .auth-field input::placeholder{color:#3f3f46}
        .auth-field input:disabled{opacity:0.5}
        .auth-label-row{display:flex;align-items:center;justify-content:space-between}
        .auth-forgot{font-size:0.75rem;color:#f97316;text-decoration:none;font-weight:500}
        .auth-forgot:hover{opacity:0.8}
        .auth-pass-wrap{position:relative}
        .auth-pass-wrap input{padding-right:2.75rem}
        .auth-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;padding:4px;line-height:1}
        .auth-error{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;font-size:0.82rem;border-radius:10px;padding:0.65rem 0.9rem}
        .auth-btn{padding:0.8rem;background:#f97316;color:white;border:none;border-radius:12px;font-size:0.9rem;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s,transform .15s;margin-top:0.25rem}
        .auth-btn:hover:not(:disabled){background:#ea6c0a;transform:translateY(-1px)}
        .auth-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .auth-spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin .65s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .auth-footer{text-align:center;margin-top:1.5rem;font-size:0.85rem;color:#71717a}
        .auth-link{color:#f97316;text-decoration:none;font-weight:600}
        .auth-link:hover{opacity:0.8}
      `}</style>
    </div>
  );
}
