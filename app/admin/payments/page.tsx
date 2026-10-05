"use client";

// Historiku i pagesave të paketave — për kontabilitet dhe ndjekje.

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { PaymentRecord } from "@/lib/payments";

type Row = PaymentRecord & { id: string };

export default function PaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(""); // YYYY-MM

  useEffect(() => {
    getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(500)))
      .then(s => setRows(s.docs.map(d => ({ id: d.id, ...d.data() } as Row))))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => Array.from(new Set(rows.map(r => r.date?.slice(0, 7)).filter(Boolean))).sort().reverse(), [rows]);
  const list = rows.filter(r => !month || r.date?.startsWith(month));
  const total = list.reduce((n, r) => n + (r.amountEur || 0), 0);
  const byMethod = list.reduce((m, r) => { m[r.method] = (m[r.method] || 0) + (r.amountEur || 0); return m; }, {} as Record<string, number>);
  const byType = { business: list.filter(r => r.type === "business").reduce((n, r) => n + r.amountEur, 0), professional: list.filter(r => r.type === "professional").reduce((n, r) => n + r.amountEur, 0) };

  const exportCsv = () => {
    const head = ["Data", "Lloji", "Emri", "Paketa", "Muaj", "Shuma (€)", "Mënyra", "Aprovim/Rinovim"];
    const lines = list.map(r => [r.date, r.type === "business" ? "Biznes" : "Profesionist", r.name, r.planName, r.months, r.amountEur, r.method, r.kind]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nearbuy-pagesat-${month || "te-gjitha"}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="pay-header">
        <div>
          <h1>Pagesat</h1>
          <p>Çdo aprovim ose rinovim paketash nga paneli regjistrohet këtu.</p>
        </div>
        <div className="pay-ctrl">
          <select value={month} onChange={e => setMonth(e.target.value)} className="pay-sel">
            <option value="">Të gjithë muajt</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={exportCsv} className="pay-btn" disabled={list.length === 0}>⬇ Eksporto CSV</button>
        </div>
      </div>

      <div className="pay-kpis">
        <div className="pay-kpi"><span className="pay-kpi-n">€{total.toLocaleString()}</span><span>Gjithsej{month ? ` · ${month}` : ""}</span></div>
        <div className="pay-kpi"><span className="pay-kpi-n">€{byType.business.toLocaleString()}</span><span>Nga bizneset</span></div>
        <div className="pay-kpi"><span className="pay-kpi-n">€{byType.professional.toLocaleString()}</span><span>Nga profesionistët</span></div>
        <div className="pay-kpi"><span className="pay-kpi-n">{list.length}</span><span>{Object.entries(byMethod).map(([k, v]) => `${k} €${v}`).join(" · ") || "pagesa"}</span></div>
      </div>

      {loading ? <p className="pay-muted">Duke ngarkuar...</p> : list.length === 0 ? (
        <p className="pay-muted">Ende s'ka pagesa të regjistruara. Do të shfaqen këtu sapo të aprovosh ose rinovosh një paketë.</p>
      ) : (
        <div className="pay-table-wrap">
          <table className="pay-table">
            <thead><tr><th>Data</th><th>Emri</th><th>Paketa</th><th>Muaj</th><th>Shuma</th><th>Mënyra</th><th></th></tr></thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td><span className="pay-type">{r.type === "business" ? "🏪" : "👷"}</span> {r.name}</td>
                  <td>{r.planName}</td>
                  <td>{r.months}</td>
                  <td className="pay-amt">€{r.amountEur}</td>
                  <td>{r.method}</td>
                  <td className="pay-kind">{r.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .pay-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem}
        .pay-header h1{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:0.25rem}
        .pay-header p{font-size:0.85rem;color:#71717a}
        .pay-ctrl{display:flex;gap:8px}
        .pay-sel{background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e4e4e7;font-size:0.82rem;padding:0.45rem 0.6rem;font-family:inherit}
        .pay-btn{padding:0.5rem 1rem;background:transparent;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e4e4e7;font-size:0.82rem;cursor:pointer;font-family:inherit}
        .pay-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:1.25rem}
        .pay-kpi{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:0.9rem 1rem;display:flex;flex-direction:column;gap:4px;font-size:0.78rem;color:#71717a}
        .pay-kpi-n{font-size:1.4rem;font-weight:800;color:#22c55e}
        .pay-muted{color:#71717a;font-size:0.85rem}
        .pay-table-wrap{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:auto}
        .pay-table{width:100%;border-collapse:collapse;font-size:0.84rem}
        .pay-table th{text-align:left;padding:0.7rem 1rem;font-size:0.72rem;color:#71717a;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.07)}
        .pay-table td{padding:0.7rem 1rem;color:#d4d4d8;border-bottom:1px solid rgba(255,255,255,0.04)}
        .pay-amt{color:#22c55e!important;font-weight:700}
        .pay-kind{color:#71717a!important;font-size:0.76rem}
        @media(max-width:800px){.pay-kpis{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  );
}
