// ════════════════════════════════════════════════════════════════════
// PAKETAT PËR PROFESIONISTËT — i vetmi vend ku ndryshohen çmimet dhe limitet.
// (Të ndara nga paketat e dyqaneve te lib/plans.ts)
// ════════════════════════════════════════════════════════════════════

import { getSubscriptionState } from "./subscription";

export type ProPlanId = "free" | "standard" | "premium";

export interface ProPlanDef {
  id: ProPlanId;
  name: string;
  priceEur: number;
  maxPhotos: number;   // foto punimesh
  maxZones: number;    // qytete ku punon
  rank: number;        // renditja në kërkim
  jobRequests: boolean; // kërkesat për punë nga klientët
  featured: boolean;   // badge "Featured" + homepage
  fullStats: boolean;
  color: string;
  perks: string[];
}

export const PRO_PLANS: Record<ProPlanId, ProPlanDef> = {
  free: {
    id: "free", name: "Falas", priceEur: 0, maxPhotos: 3, maxZones: 1, rank: 0,
    jobRequests: false, featured: false, fullStats: false, color: "#a1a1aa",
    perks: ["Profil me telefon dhe WhatsApp", "3 foto punimesh", "1 qytet pune", "Vlerësime nga klientët"],
  },
  standard: {
    id: "standard", name: "Pro", priceEur: 10, maxPhotos: 20, maxZones: 3, rank: 1,
    jobRequests: true, featured: false, fullStats: true, color: "#a855f7",
    perks: ["Kërkesat për punë nga klientët", "20 foto punimesh", "Deri në 3 qytete", "Renditje më lart", "Statistika të plota"],
  },
  premium: {
    id: "premium", name: "Premium", priceEur: 15, maxPhotos: 20, maxZones: 3, rank: 2,
    jobRequests: true, featured: true, fullStats: true, color: "#f97316",
    perks: ["Kërkesat për punë 2 orë para Pro-s", "I pari në renditje", "Shenja \"⭐ I rekomanduar\" + homepage", "Gjithçka te Pro"],
  },
};

export const PRO_PLAN_ORDER: ProPlanId[] = ["free", "standard", "premium"];

export function normalizeProPlanId(raw: unknown): ProPlanId {
  const s = String(raw || "free").toLowerCase();
  if (s === "standard" || s === "monthly" || s === "basic") return "standard";
  if (s === "premium" || s === "yearly") return "premium";
  return "free";
}

export function getEffectiveProPlan(p: Record<string, unknown> | null | undefined): ProPlanDef {
  const st = getSubscriptionState(p ? { ...p, subscription: normalizeProPlanId(p.subscription) } : null);
  return st.active ? PRO_PLANS[normalizeProPlanId(p?.subscription)] : PRO_PLANS.free;
}

// ── Lista e fiksuar e profesioneve (që filtrimi të funksionojë) ──────────
export const PROFESSIONS = [
  "Hidraulik", "Elektricist", "Bojaxhi", "Murator", "Pllakaxhi", "Montues gipsi",
  "Karpentier", "Saldator", "Hidroizolues", "Teknik kondicionerësh", "Montues dyer & dritaresh",
  "Kopshtar", "Pastrim", "Transport & lëvizje", "Tjetër",
];

const PROFESSION_HINTS: [RegExp, string][] = [
  [/hidraul/i, "Hidraulik"], [/elektri/i, "Elektricist"], [/boj/i, "Bojaxhi"], [/murat|ndërtu|ndertu/i, "Murator"],
  [/pllak|karrol/i, "Pllakaxhi"], [/gips|kartongips/i, "Montues gipsi"], [/karpent|zdruk|druri/i, "Karpentier"],
  [/sald/i, "Saldator"], [/hidroizol|izolim/i, "Hidroizolues"], [/kondicion|klim/i, "Teknik kondicionerësh"],
  [/dyer|dritar|alumin|pvc/i, "Montues dyer & dritaresh"], [/kopsht/i, "Kopshtar"], [/pastr/i, "Pastrim"],
  [/transport|lëviz|leviz/i, "Transport & lëvizje"],
];

export function normalizeProfession(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const exact = PROFESSIONS.find(p => p.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  return PROFESSION_HINTS.find(([rx]) => rx.test(s))?.[1] || s;
}
