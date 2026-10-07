// Periudhat për statistikat e tregut — të njëjtat në faqe dhe në server.
// Java = java ISO (e hënë → e diel), p.sh. "2026-W41". Muaji = "2026-10".

const DAY = 86400000;

export function weekId(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); // e enjtja e javës përcakton vitin
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / DAY + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

// Javët e fundit, e tanishmja e para: ["2026-W41", "2026-W40", ...]
export function lastWeeks(n: number, from: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => weekId(new Date(from.getTime() - i * 7 * DAY)));
}

export function monthId(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function prevMonthId(d: Date = new Date()): string {
  return monthId(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15)));
}

// Çelësi i dokumentit për kërkesat pa dyqan: qyteti + muaji ("Durrës_2026-10")
export const unmetKey = (city: string, month: string) => `${city}_${month}`;

// 1 kontakt / 3 kontakte, 1 shikim / 3 shikime, 1 klient / 3 klientë
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
