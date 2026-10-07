import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "@/app/BrandLogo";

// Pamja e përbashkët për Kushtet dhe Privatësinë
export default function LegalShell({ title, updated, children, other }: {
  title: string;
  updated: string;
  children: ReactNode;
  other: { href: string; label: string };
}) {
  return (
    <div className="legal-root">
      <nav className="legal-nav">
        <Link href="/" aria-label="NearBuy.al — faqja kryesore" style={{ textDecoration: "none" }}>
          <BrandLogo size={18} />
        </Link>
      </nav>

      <div className="legal-container">
        <div className="legal-header">
          <h1>{title}</h1>
          <p>Përditësuar: {updated}</p>
        </div>

        <div className="legal-content">{children}</div>

        <div className="legal-footer">
          <Link href="/" className="legal-back">← Kthehu në faqen kryesore</Link>
          <Link href={other.href} className="legal-link">{other.label} →</Link>
        </div>
      </div>

      <style>{`
        .legal-root{min-height:100vh;background:#0a0a0a;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#e4e4e7}
        .legal-root *{box-sizing:border-box}
        .legal-nav{position:sticky;top:0;z-index:40;display:flex;align-items:center;padding:0 1.25rem;height:60px;background:rgba(10,10,10,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06)}
        .legal-container{max-width:760px;margin:0 auto;padding:2.5rem 1rem 3rem}
        .legal-header{margin-bottom:2.25rem;padding-bottom:1.25rem;border-bottom:1px solid rgba(255,255,255,0.07)}
        .legal-header h1{margin:0 0 .5rem;font-size:2rem;font-weight:800;color:#fff;letter-spacing:-0.025em}
        .legal-header p{margin:0;font-size:.85rem;color:#71717a}
        .legal-content{display:flex;flex-direction:column;gap:2rem}
        .legal-content section{display:flex;flex-direction:column;gap:.7rem}
        .legal-content h2{margin:0;font-size:1.02rem;font-weight:700;color:#F97316;letter-spacing:-0.01em}
        .legal-content p{margin:0;font-size:.92rem;color:#a1a1aa;line-height:1.7}
        .legal-content ul{margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:.45rem}
        .legal-content li{font-size:.9rem;color:#a1a1aa;line-height:1.6}
        .legal-content strong{color:#e4e4e7;font-weight:600}
        .legal-content a{color:#fb923c}
        .legal-note{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:1rem 1.1rem}
        .legal-footer{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.07)}
        .legal-back{font-size:.875rem;color:#71717a;text-decoration:none}
        .legal-back:hover{color:#fff}
        .legal-link{font-size:.875rem;color:#F97316;text-decoration:none;font-weight:600}
        .legal-link:hover{opacity:.85}
      `}</style>
    </div>
  );
}
