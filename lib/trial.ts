// Oferta e nisjes: 30 ditë Premium falas, një herë për çdo dyqan ose mjeshtër.
// E aktivizon admini me një klik. Pas afatit, llogaria kalon vetë te Falas (pa humbur të dhënat).

export const TRIAL_DAYS = 30;
export const TRIAL_METHOD = "Provë falas";

export function trialFields(from: Date = new Date()) {
  const start = from.toISOString().split("T")[0];
  const end = new Date(from.getTime() + TRIAL_DAYS * 86400000).toISOString().split("T")[0];
  return {
    subscription: "premium",
    planStatus: "active",
    requestedPlan: null,
    subscriptionStart: start,
    subscriptionEnd: end,
    paymentMethod: TRIAL_METHOD,
    trialUsed: true,
    trialStart: start,
  };
}

export const isTrial = (b: Record<string, unknown> | null | undefined) => b?.paymentMethod === TRIAL_METHOD;
