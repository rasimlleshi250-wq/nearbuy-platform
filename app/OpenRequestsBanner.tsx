"use client";

// Kartë e vogël poshtë faqes: "Ke një kërkesë të hapur — e gjete?"
// Shfaqet vetëm te klienti që e dërgoi kërkesën, nga i njëjti telefon/kompjuter.

import { useEffect, useState } from "react";
import { pendingMyRequests, snoozeMyRequest, closeMyRequest, type MyRequest } from "@/lib/myRequests";

export default function OpenRequestsBanner() {
  const [list, setList] = useState<MyRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Mos e shfaq menjëherë pas dërgimit — vetëm pas 1 ore
    setList(pendingMyRequests().filter(r => Date.now() - r.createdAt > 60 * 60 * 1000));
  }, []);

  const current = list[0];
  if (!current && !done) return null;

  const next = () => setList(prev => prev.slice(1));

  const close = async () => {
    if (!current) return;
    setBusy(true); setError("");
    try {
      await closeMyRequest(current);
      next();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nuk u mbyll. Provo përsëri.");
    } finally { setBusy(false); }
  };

  const later = () => { if (current) snoozeMyRequest(current.id); next(); };

  return (
    <div className="orb" role="dialog" aria-live="polite">
      {done && !current ? (
        <p className="orb-done">✓ Kërkesa u mbyll. Nuk do të të telefonojnë më. Faleminderit!</p>
      ) : current && (
        <>
          <button className="orb-x" onClick={later} aria-label="Mbyll">×</button>
          <p className="orb-label">Kërkesa jote{list.length > 1 ? ` · 1 nga ${list.length}` : ""}</p>
          <p className="orb-title">{current.title}</p>
          <p className="orb-text">
            {current.kind === "job" ? "E gjete mjeshtrin?" : "E gjete produktin?"} Nëse po, mbylle kërkesën që të mos të telefonojnë të tjerët.
          </p>
          {error && <p className="orb-err">{error}</p>}
          <div className="orb-actions">
            <button className="orb-yes" disabled={busy} onClick={close}>{busy ? "Duke mbyllur..." : "Po, e gjeta — mbylle"}</button>
            <button className="orb-no" disabled={busy} onClick={later}>Jo ende</button>
          </div>
        </>
      )}
      <style>{`
        .orb{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:60;width:calc(100% - 32px);max-width:420px;background:#141414;color:#f4f4f5;border:1px solid rgba(245,200,66,0.35);border-radius:16px;padding:1rem 1.1rem;box-shadow:0 18px 50px rgba(0,0,0,0.45);font-family:'Plus Jakarta Sans',system-ui,sans-serif;display:flex;flex-direction:column;gap:6px}
        .orb-x{position:absolute;top:6px;right:10px;background:none;border:none;color:#71717a;font-size:1.3rem;cursor:pointer;line-height:1}
        .orb-label{font-size:0.7rem;font-weight:700;color:#f5c842;text-transform:uppercase;letter-spacing:0.05em}
        .orb-title{font-size:0.95rem;font-weight:700;padding-right:1.5rem}
        .orb-text{font-size:0.84rem;color:#a1a1aa;line-height:1.45}
        .orb-err{font-size:0.8rem;color:#f87171}
        .orb-actions{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap}
        .orb-yes{flex:1;min-width:160px;padding:0.65rem 0.9rem;background:#f5c842;color:#111;border:none;border-radius:10px;font-weight:700;font-size:0.86rem;cursor:pointer;font-family:inherit}
        .orb-no{padding:0.65rem 0.9rem;background:transparent;color:#a1a1aa;border:1px solid rgba(255,255,255,0.15);border-radius:10px;font-size:0.86rem;cursor:pointer;font-family:inherit}
        .orb-yes:disabled,.orb-no:disabled{opacity:0.6}
        .orb-done{font-size:0.88rem;color:#22c55e;text-align:center}
      `}</style>
    </div>
  );
}
