import Link from "next/link";

export default function NotFound() {
  return (
    <div className="nf-root">
      <div className="nf-content">
        <div className="nf-glow" />
        <div className="nf-badge">404</div>
        <h1 className="nf-title">Faqja nuk u gjet</h1>
        <p className="nf-sub">Faqja që po kërkoni nuk ekziston ose është zhvendosur.</p>
        <div className="nf-actions">
          <Link href="/" className="nf-btn-primary">← Kthehu në faqen kryesore</Link>
          <Link href="/search" className="nf-btn-secondary">Kërko produkte</Link>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .nf-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:2rem}
        .nf-content{position:relative;text-align:center;max-width:480px}
        .nf-glow{position:absolute;inset:-60px;background:radial-gradient(ellipse 70% 50% at 50% 50%,rgba(245,200,66,0.06),transparent 70%);pointer-events:none}
        .nf-badge{font-size:6rem;font-weight:900;color:rgba(245,200,66,0.15);letter-spacing:-0.05em;line-height:1;margin-bottom:1rem}
        .nf-title{font-size:1.75rem;font-weight:800;color:#fff;letter-spacing:-0.025em;margin-bottom:0.75rem}
        .nf-sub{font-size:0.95rem;color:#71717a;line-height:1.6;margin-bottom:2rem}
        .nf-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
        .nf-btn-primary{padding:0.7rem 1.5rem;background:#f5c842;color:#0a0a0a;font-size:0.875rem;font-weight:700;border-radius:10px;text-decoration:none;transition:background .2s,transform .15s}
        .nf-btn-primary:hover{background:#e6b93a;transform:translateY(-1px)}
        .nf-btn-secondary{padding:0.7rem 1.5rem;background:transparent;color:#a1a1aa;font-size:0.875rem;font-weight:500;border-radius:10px;text-decoration:none;border:1px solid rgba(255,255,255,0.08);transition:all .2s}
        .nf-btn-secondary:hover{border-color:rgba(255,255,255,0.2);color:#fff}
      `}</style>
    </div>
  );
}
