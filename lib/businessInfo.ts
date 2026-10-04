// Ndihmëse për profilin e biznesit: orari, "Hapur tani", WhatsApp.

export const DAYS = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];

export interface DayHours {
  closed: boolean;
  open: string;  // "08:00"
  close: string; // "18:00"
}

export function defaultHours(): DayHours[] {
  return DAYS.map((_, i) => ({ closed: i === 6, open: "08:00", close: i === 5 ? "14:00" : "18:00" }));
}

export function isValidHours(h: unknown): h is DayHours[] {
  return Array.isArray(h) && h.length === 7 && h.every(d => d && typeof d.open === "string" && typeof d.close === "string");
}

// Teksti i vjetër "E hënë: 08:00 - 18:00, ..." — që faqet ekzistuese të vazhdojnë të punojnë
export function hoursToSchedule(hours: DayHours[]): string {
  return hours.map((d, i) => `${DAYS[i]}: ${d.closed ? "Mbyllur" : `${d.open} - ${d.close}`}`).join(", ");
}

// Ora dhe dita në Shqipëri, pavarësisht ku ndodhet vizitori
function nowInAlbania(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Tirane", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const h = parseInt(get("hour"), 10) % 24, m = parseInt(get("minute"), 10);
  return { day: wd < 0 ? 0 : wd, minutes: h * 60 + m };
}

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

export function openStatus(hours: DayHours[] | undefined): { open: boolean; label: string } | null {
  if (!isValidHours(hours)) return null;
  const { day, minutes } = nowInAlbania();
  const today = hours[day];
  if (!today.closed) {
    const o = toMin(today.open), c = toMin(today.close);
    if (minutes >= o && minutes < c) return { open: true, label: `Hapur tani · mbyll në ${today.close}` };
    if (minutes < o) return { open: false, label: `Mbyllur · hapet sot në ${today.open}` };
  }
  for (let k = 1; k <= 7; k++) {
    const d = hours[(day + k) % 7];
    if (!d.closed) return { open: false, label: `Mbyllur · hapet ${k === 1 ? "nesër" : DAYS[(day + k) % 7].toLowerCase()} në ${d.open}` };
  }
  return { open: false, label: "Mbyllur" };
}

// 068 259 5950 -> 355682595950 ; +355 68... -> 35568...
export function normalizeWhatsApp(raw: string | undefined): string | null {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("355")) return d;
  if (d.startsWith("0")) return "355" + d.slice(1);
  if (d.length === 9 && d.startsWith("6")) return "355" + d;
  return d;
}

export function whatsappLink(number: string | undefined, text: string): string | null {
  const n = normalizeWhatsApp(number);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export const PAYMENT_OPTIONS = ["Cash", "Kartë", "Transfertë bankare", "Me këste"];
