// ════════════════════════════════════════════════════════════════════
// RREGULLAT E KËRKESAVE TË KLIENTËVE — një vend i vetëm, për faqen dhe serverin.
// (Kërkesa për produkt te dyqanet, kërkesa për punë te mjeshtrit)
// ════════════════════════════════════════════════════════════════════

export const CITIES = ["Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec", "Peshkopi"];
export const URGENCY = ["Sot / urgjent", "Këtë javë", "S'ka nxitim"];

// Pas sa ditësh kërkesa nuk u shfaqet më bizneseve si aktive
export const EXPIRY_DAYS = { product: 3, job: 7 } as const;
// Pas sa ditësh fshihen emri dhe numri i klientit nga databaza
export const RETENTION_DAYS = 60;
// Pas sa kontakteve u themi të tjerëve "e kanë kontaktuar tashmë"
export const CONTACTED_WARNING = 3;

// Kufijtë kundër kërkesave të rreme
export const LIMITS = {
  perPhonePerDay: 3,   // kërkesa nga i njëjti numër në 24 orë (për çdo lloj)
  perDevicePerDay: 8,  // kërkesa nga e njëjta lidhje interneti në 24 orë (gjithsej)
};

export type RequestKind = "product" | "job";

// ── Telefoni ─────────────────────────────────────────────────────
// Pranon numra celularë shqiptarë: 069 123 4567, 69 123 4567, +355 69 123 4567, 00355...
// Kthen "355691234567" ose null nëse numri nuk është i saktë.
export function normalizePhone(input: string): string | null {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("355")) { /* ok */ }
  else if (d.startsWith("0")) d = "355" + d.slice(1);
  else if (d.length === 9 && d.startsWith("6")) d = "355" + d;
  return /^3556[6-9]\d{7}$/.test(d) ? d : null;
}

// "355691234567" → "+355 69 123 4567"
export function formatPhone(norm: string): string {
  return `+${norm.slice(0, 3)} ${norm.slice(3, 5)} ${norm.slice(5, 8)} ${norm.slice(8)}`;
}

export const PHONE_ERROR = "Shkruaj një numër celulari shqiptar të saktë (p.sh. 069 123 4567).";

// ── Gjendja e një kërkese për biznesin/mjeshtrin ─────────────────
export function isExpired(kind: RequestKind, createdAtSeconds?: number): boolean {
  if (!createdAtSeconds) return false;
  return Date.now() / 1000 - createdAtSeconds > EXPIRY_DAYS[kind] * 86400;
}
