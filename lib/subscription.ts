// Gjendja e abonimit të një biznesi — një vend i vetëm për të gjitha faqet.
// Aktiv = planStatus "active" DHE subscriptionEnd nuk ka kaluar.

export const PLAN_LABELS: Record<string, string> = {
  free: "Falas", basic: "Basic", advanced: "Advanced", pro: "Pro",
};

export interface SubscriptionState {
  plan: string;          // "free" | "basic" | "advanced" | "pro"
  label: string;         // për shfaqje
  active: boolean;       // plan me pagesë, i aprovuar dhe pa skaduar
  expired: boolean;      // kishte plan me pagesë, por data kaloi
  endDate: Date | null;
  daysLeft: number | null;
}

export function toDate(raw: unknown): Date | null {
  if (!raw) return null;
  const t = raw as { toDate?: () => Date; seconds?: number };
  const d = raw instanceof Date ? raw
    : typeof t.toDate === "function" ? t.toDate()
    : typeof t.seconds === "number" ? new Date(t.seconds * 1000)
    : new Date(String(raw));
  return isNaN(d.getTime()) ? null : d;
}

export function getSubscriptionState(b: Record<string, unknown> | null | undefined): SubscriptionState {
  const plan = String(b?.subscription || "free");
  const endDate = toDate(b?.subscriptionEnd);
  const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / 86400000) : null;
  const paid = plan !== "free";
  const approved = b?.planStatus === "active";
  const expired = paid && endDate !== null && endDate.getTime() < Date.now();
  return {
    plan,
    label: PLAN_LABELS[plan] || plan,
    active: paid && approved && !expired,
    expired,
    endDate,
    daysLeft,
  };
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("sq-AL", { day: "numeric", month: "short", year: "numeric" });
}
