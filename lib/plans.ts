// ════════════════════════════════════════════════════════════════════
// PAKETAT E ABONIMIT — i vetmi vend ku ndryshohen çmimet dhe limitet.
// Çdo faqe (dashboard, profili publik, produkti, homepage) lexon nga këtu.
// ════════════════════════════════════════════════════════════════════

import { getSubscriptionState } from "./subscription";

export type PlanId = "free" | "baze" | "plus" | "premium";
export type StatsLevel = "total" | "monthly" | "charts" | "full";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceEur: number;
  maxProducts: number | null; // null = pa limit
  excel: boolean;             // ngarkim me Excel
  offers: boolean;            // oferta me zbritje
  stats: StatsLevel;
  rank: number;               // sa lart renditet (më i madh = më lart)
  featured: boolean;          // badge "Featured" + vend në homepage
  leads: boolean;             // kërkesat e klientëve nga faqet "0 dyqane"
  color: string;
  perks: string[];            // tekstet që shfaqen te karta e paketës
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free", name: "Falas", priceEur: 0, maxProducts: 30, excel: false, offers: false,
    stats: "total", rank: 0, featured: false, leads: false, color: "#71717a",
    perks: ["Deri në 30 produkte", "Profil me foto, orar dhe hartë", "Butonat WhatsApp dhe telefon", "Statistika bazë"],
  },
  baze: {
    id: "baze", name: "Bazë", priceEur: 10, maxProducts: 300, excel: true, offers: true,
    stats: "monthly", rank: 0, featured: false, leads: false, color: "#3b82f6",
    perks: ["Deri në 300 produkte", "Ngarkim me Excel", "Oferta me zbritje", "Shikime dhe kontakte për çdo produkt"],
  },
  plus: {
    id: "plus", name: "Plus", priceEur: 15, maxProducts: null, excel: true, offers: true,
    stats: "charts", rank: 1, featured: false, leads: true, color: "#a855f7",
    perks: ["Produkte pa limit", "Renditje më lart se Falas dhe Bazë", "Kërkesat e klientëve për produkte", "Çfarë kërkojnë klientët + ku të bësh ofertë", "Grafikët e 30 ditëve"],
  },
  premium: {
    id: "premium", name: "Premium", priceEur: 20, maxProducts: null, excel: true, offers: true,
    stats: "full", rank: 2, featured: true, leads: true, color: "#f97316",
    perks: ["Gjithçka te Plus", "I pari në renditje", "Badge \"Featured\" + vend në homepage", "Kërkesat e klientëve të parat", "Krahasim mujor + top produktet"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "baze", "plus", "premium"];

// Emrat e vjetër në databazë kalojnë vetë te të rinjtë
const LEGACY: Record<string, PlanId> = { basic: "baze", advanced: "plus", pro: "premium" };

export function normalizePlanId(raw: unknown): PlanId {
  const s = String(raw || "free").toLowerCase();
  if (s in PLANS) return s as PlanId;
  return LEGACY[s] || "free";
}

// Plani që vlen SOT: plan me pagesë i aprovuar dhe pa skaduar, përndryshe Falas
export function getEffectivePlan(b: Record<string, unknown> | null | undefined): PlanDef {
  const st = getSubscriptionState(b);
  return st.active ? PLANS[normalizePlanId(st.plan)] : PLANS.free;
}

// Sa produkte të tjera mund të shtojë (null = pa limit)
export function remainingSlots(plan: PlanDef, currentCount: number): number | null {
  return plan.maxProducts === null ? null : Math.max(0, plan.maxProducts - currentCount);
}

export const STATS_RANK: Record<StatsLevel, number> = { total: 0, monthly: 1, charts: 2, full: 3 };
export const hasStats = (plan: PlanDef, level: StatsLevel) => STATS_RANK[plan.stats] >= STATS_RANK[level];

export const formatEur = (n: number) => (n === 0 ? "Falas" : `€${n}`);
