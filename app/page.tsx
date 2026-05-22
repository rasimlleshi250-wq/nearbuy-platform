"use client";

import { useState, useEffect, useRef } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const CATEGORIES = ["Hidraulikë", "Elektrik", "Ndërtim", "Bojëra & Kimikate", "Kopshtari"];
const ZONES = [
  "Tiranë - Qendër", "Tiranë - Kombinat", "Tiranë - Kashar", "Tiranë - Tjetër",
  "Durrës", "Shkodër", "Vlorë", "Elbasan", "Fier", "Korçë",
  "Gjirokastër", "Berat", "Lushnjë", "Kavajë", "Tjetër"
];

export default function ComingSoonPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    zone: "",
    category: "",
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,200,66,${p.alpha})`;
        ctx.fill();
      });
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245,200,66,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!form.businessName.trim()) { setError("Shkruaj emrin e biznesit."); return; }
    if (!form.contactName.trim())  { setError("Shkruaj emrin e kontaktit."); return; }
    if (!form.phone.trim())        { setError("Shkruaj numrin e telefonit."); return; }
    if (!form.zone)                { setError("Zgjidh zonën."); return; }
    if (!form.category)            { setError("Zgjidh kategorinë."); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, "leads"), {
        ...form,
        createdAt: serverTimestamp(),
        status: "new",
      });
      setSubmitted(true);
    } catch {
      setError("Ndodhi një gabim. Provo sërish.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cs-root">
      <canvas ref={canvasRef} className="cs-canvas" />

      {/* Noise overlay */}
      <div className="cs-noise" />

      {/* Top bar */}
      <nav className="cs-nav">
        <span className="cs-logo">Near<span>Buy</span>.al</span>
        <a href="https://wa.me/355XXXXXXXXX" target="_blank" rel="noopener noreferrer" className="cs-wa-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Na kontakto
        </a>
      </nav>

      <main className="cs-main">
        {/* Left — Hero */}
        <div className="cs-hero">
          <div className="cs-badge">
            <span className="cs-badge-dot" />
            Regjistrime të hapura
          </div>

          <h1 className="cs-title">
            Platforma shqiptare<br />
            <span className="cs-title-accent">e bizneseve</span><br />
            të ndërtimit
          </h1>

          <p className="cs-desc">
            NearBuy.al lidh bizneset e materialeve të ndërtimit, 
            hidraulikës, elektrikës dhe kopshtarisë me klientët 
            që kërkojnë produkte dhe profesionistë lokalë.
          </p>

          {/* Stats */}
          <div className="cs-stats">
            <div className="cs-stat">
              <span className="cs-stat-num">7,600+</span>
              <span className="cs-stat-label">produkte në platformë</span>
            </div>
            <div className="cs-stat-divider" />
            <div className="cs-stat">
              <span className="cs-stat-num">5</span>
              <span className="cs-stat-label">kategori kryesore</span>
            </div>
            <div className="cs-stat-divider" />
            <div className="cs-stat">
              <span className="cs-stat-num" style={{fontSize:"1.1rem",letterSpacing:"0.02em"}}>Kudo</span>
              <span className="cs-stat-label">çdo qytet i Shqipërisë</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="cs-benefits">
            {[
              { icon: "🎯", text: "Profil biznesi falas — gjithmonë" },
              { icon: "📍", text: "Klientë lokalë nga zona jote" },
              { icon: "⚡", text: "Online në 5 minuta" },
              { icon: "🏆", text: "Bizneset e para marrin pozicion premium" },
            ].map((b, i) => (
              <div key={i} className="cs-benefit">
                <span className="cs-benefit-icon">{b.icon}</span>
                <span className="cs-benefit-text">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div className="cs-form-wrap">
          {submitted ? (
            <div className="cs-success">
              <div className="cs-success-icon">✓</div>
              <h2 className="cs-success-title">Faleminderit!</h2>
              <p className="cs-success-text">
                Biznesi yt u regjistrua me sukses.<br />
                Do të kontaktohesh personalisht para lansimit publik.
              </p>
            </div>
          ) : (
            <>
              <div className="cs-form-header">
                <h2 className="cs-form-title">Regjistro biznesin tënd</h2>
                <p className="cs-form-sub">Falas — gjithmonë. Hap pozicionin tënd para lansimit.</p>
              </div>

              <div className="cs-form">
                <div className="cs-field">
                  <label className="cs-label">Emri i biznesit *</label>
                  <input
                    className="cs-input"
                    placeholder="p.sh. Hidraulika Arbër"
                    value={form.businessName}
                    onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                  />
                </div>

                <div className="cs-field">
                  <label className="cs-label">Emri i kontaktit *</label>
                  <input
                    className="cs-input"
                    placeholder="Emri dhe mbiemri"
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  />
                </div>

                <div className="cs-field">
                  <label className="cs-label">Numri i telefonit *</label>
                  <input
                    className="cs-input"
                    placeholder="06X XXX XXXX"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="cs-field">
                  <label className="cs-label">Zona *</label>
                  <select
                    className="cs-input cs-select"
                    value={form.zone}
                    onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                  >
                    <option value="">Zgjidh zonën...</option>
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>

                <div className="cs-field">
                  <label className="cs-label">Kategoria *</label>
                  <div className="cs-cat-grid">
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: c }))}
                        className={`cs-cat-chip ${form.category === c ? "active" : ""}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="cs-error">⚠ {error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="cs-submit"
                >
                  {loading ? (
                    <span className="cs-btn-spinner" />
                  ) : (
                    <>Regjistro biznesin tim — Falas <span className="cs-arrow">→</span></>
                  )}
                </button>

                <p className="cs-privacy">
                  Pa spam. Pa kosto. Do të kontaktohesh personalisht para lansimit.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Bottom strip */}
      <footer className="cs-footer">
        <span>© 2025 NearBuy.al</span>
        <span className="cs-footer-dot">·</span>
        <span>Platforma shqiptare e bizneseve të ndërtimit</span>
        <span className="cs-footer-dot">·</span>
        <span>Tiranë, Shqipëri</span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        *{box-sizing:border-box;margin:0;padding:0}

        .cs-root{
          min-height:100vh;
          background:#080808;
          font-family:'DM Sans',system-ui,sans-serif;
          color:#f5f5f4;
          display:flex;
          flex-direction:column;
          position:relative;
          overflow-x:hidden;
        }

        .cs-canvas{
          position:fixed;inset:0;pointer-events:none;z-index:0;
        }
        .cs-noise{
          position:fixed;inset:0;pointer-events:none;z-index:1;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:0.35;
        }

        /* Nav */
        .cs-nav{
          position:relative;z-index:10;
          display:flex;align-items:center;justify-content:space-between;
          padding:1.25rem 3rem;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .cs-logo{
          font-family:'Syne',sans-serif;
          font-size:1.3rem;font-weight:800;color:#fff;
          letter-spacing:-0.02em;
        }
        .cs-logo span{color:#f5c842}
        .cs-wa-btn{
          display:flex;align-items:center;gap:7px;
          padding:0.5rem 1.1rem;
          background:rgba(37,211,102,0.1);
          border:1px solid rgba(37,211,102,0.25);
          border-radius:999px;
          color:#25d366;font-size:0.82rem;font-weight:600;
          text-decoration:none;transition:all .2s;
        }
        .cs-wa-btn:hover{background:rgba(37,211,102,0.18)}

        /* Main layout */
        .cs-main{
          position:relative;z-index:5;
          flex:1;display:grid;
          grid-template-columns:1fr 1fr;
          gap:4rem;
          max-width:1200px;margin:0 auto;
          padding:4rem 3rem;
          align-items:start;
        }

        /* Hero */
        .cs-badge{
          display:inline-flex;align-items:center;gap:8px;
          padding:0.4rem 1rem;
          background:rgba(245,200,66,0.08);
          border:1px solid rgba(245,200,66,0.2);
          border-radius:999px;
          font-size:0.78rem;font-weight:600;color:#f5c842;
          margin-bottom:1.75rem;
          animation:fadeUp .6s ease both;
        }
        .cs-badge-dot{
          width:7px;height:7px;border-radius:50%;
          background:#f5c842;
          box-shadow:0 0 8px #f5c842;
          animation:pulse-dot 2s ease infinite;
        }
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(0.8)}}

        .cs-title{
          font-family:'Syne',sans-serif;
          font-size:clamp(2.2rem,4vw,3.2rem);
          font-weight:800;line-height:1.1;
          color:#fff;letter-spacing:-0.03em;
          margin-bottom:1.25rem;
          animation:fadeUp .6s .1s ease both;
        }
        .cs-title-accent{
          color:transparent;
          -webkit-text-stroke:2px #f5c842;
        }
        .cs-desc{
          font-size:1rem;color:#71717a;line-height:1.7;
          max-width:480px;margin-bottom:2rem;
          animation:fadeUp .6s .2s ease both;
        }

        /* Stats */
        .cs-stats{
          display:flex;align-items:center;gap:1.5rem;
          margin-bottom:2rem;
          padding:1.25rem 1.5rem;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:14px;
          animation:fadeUp .6s .3s ease both;
        }
        .cs-stat{display:flex;flex-direction:column;gap:2px}
        .cs-stat-num{
          font-family:'Syne',sans-serif;
          font-size:1.6rem;font-weight:800;color:#f5c842;
          line-height:1;
        }
        .cs-stat-label{font-size:0.72rem;color:#52525b;font-weight:500}
        .cs-stat-divider{width:1px;height:36px;background:rgba(255,255,255,0.07);flex-shrink:0}

        /* Benefits */
        .cs-benefits{
          display:flex;flex-direction:column;gap:10px;
          animation:fadeUp .6s .4s ease both;
        }
        .cs-benefit{
          display:flex;align-items:center;gap:12px;
          padding:0.7rem 1rem;
          background:rgba(255,255,255,0.02);
          border:1px solid rgba(255,255,255,0.05);
          border-radius:10px;
          transition:border-color .2s;
        }
        .cs-benefit:hover{border-color:rgba(245,200,66,0.15)}
        .cs-benefit-icon{font-size:1.1rem;flex-shrink:0}
        .cs-benefit-text{font-size:0.875rem;color:#a1a1aa;font-weight:500}

        /* Form card */
        .cs-form-wrap{
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:20px;
          padding:2rem;
          backdrop-filter:blur(20px);
          position:sticky;top:2rem;
          animation:fadeUp .6s .15s ease both;
        }
        .cs-form-header{margin-bottom:1.5rem}
        .cs-form-title{
          font-family:'Syne',sans-serif;
          font-size:1.3rem;font-weight:700;color:#fff;
          letter-spacing:-0.02em;margin-bottom:0.4rem;
        }
        .cs-form-sub{font-size:0.82rem;color:#52525b}

        .cs-form{display:flex;flex-direction:column;gap:1rem}
        .cs-field{display:flex;flex-direction:column;gap:6px}
        .cs-label{font-size:0.78rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em}
        .cs-input{
          padding:0.7rem 0.9rem;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:10px;
          color:#f4f4f5;font-size:0.875rem;
          outline:none;font-family:'DM Sans',inherit;
          transition:border-color .2s;
          width:100%;
        }
        .cs-input:focus{border-color:rgba(245,200,66,0.4)}
        .cs-input::placeholder{color:#3f3f46}
        .cs-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
        .cs-select option{background:#1a1a1a;color:#f4f4f5}

        .cs-cat-grid{display:flex;flex-wrap:wrap;gap:6px}
        .cs-cat-chip{
          padding:0.4rem 0.85rem;
          border-radius:999px;
          border:1px solid rgba(255,255,255,0.08);
          background:transparent;
          color:#71717a;font-size:0.78rem;font-weight:500;
          cursor:pointer;font-family:inherit;transition:all .2s;
        }
        .cs-cat-chip:hover{background:rgba(255,255,255,0.04);color:#e4e4e7}
        .cs-cat-chip.active{
          background:rgba(245,200,66,0.12);
          border-color:rgba(245,200,66,0.35);
          color:#f5c842;font-weight:600;
        }

        .cs-error{font-size:0.8rem;color:#f87171;padding:0.5rem 0.75rem;background:rgba(239,68,68,0.08);border-radius:8px;border:1px solid rgba(239,68,68,0.15)}

        .cs-submit{
          padding:0.9rem;width:100%;
          background:linear-gradient(135deg,#f5c842,#f59e0b);
          border:none;border-radius:12px;
          color:#0a0a0a;font-size:0.95rem;font-weight:700;
          cursor:pointer;font-family:'Syne',sans-serif;
          letter-spacing:-0.01em;
          transition:all .2s;
          display:flex;align-items:center;justify-content:center;gap:8px;
          margin-top:0.25rem;
        }
        .cs-submit:hover:not(:disabled){
          transform:translateY(-1px);
          box-shadow:0 8px 24px rgba(245,200,66,0.3);
        }
        .cs-submit:disabled{opacity:0.6;cursor:not-allowed}
        .cs-arrow{font-size:1.1rem;transition:transform .2s}
        .cs-submit:hover .cs-arrow{transform:translateX(4px)}
        .cs-btn-spinner{
          width:18px;height:18px;
          border:2px solid rgba(10,10,10,0.3);
          border-top-color:#0a0a0a;
          border-radius:50%;
          animation:spin .7s linear infinite;
        }
        @keyframes spin{to{transform:rotate(360deg)}}

        .cs-privacy{font-size:0.72rem;color:#3f3f46;text-align:center;line-height:1.5}

        /* Success */
        .cs-success{
          display:flex;flex-direction:column;align-items:center;
          gap:1rem;padding:2rem 1rem;text-align:center;
        }
        .cs-success-icon{
          width:60px;height:60px;
          background:rgba(34,197,94,0.12);
          border:2px solid rgba(34,197,94,0.3);
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:1.5rem;color:#22c55e;font-weight:700;
        }
        .cs-success-title{font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:700;color:#fff}
        .cs-success-text{font-size:0.9rem;color:#71717a;line-height:1.6}

        /* Footer */
        .cs-footer{
          position:relative;z-index:5;
          display:flex;align-items:center;justify-content:center;
          gap:0.75rem;padding:1.25rem;
          border-top:1px solid rgba(255,255,255,0.05);
          font-size:0.75rem;color:#3f3f46;
        }
        .cs-footer-dot{color:#1f1f1f}

        /* Animations */
        @keyframes fadeUp{
          from{opacity:0;transform:translateY(20px)}
          to{opacity:1;transform:translateY(0)}
        }

        /* Responsive */
        @media(max-width:900px){
          .cs-main{grid-template-columns:1fr;gap:2.5rem;padding:2rem 1.5rem}
          .cs-nav{padding:1rem 1.5rem}
          .cs-form-wrap{position:static}
          .cs-stats{flex-wrap:wrap;gap:1rem}
        }
        @media(max-width:480px){
          .cs-title{font-size:2rem}
          .cs-stats{flex-direction:column;gap:0.75rem}
          .cs-stat-divider{display:none}
        }
      `}</style>
    </div>
  );
}
