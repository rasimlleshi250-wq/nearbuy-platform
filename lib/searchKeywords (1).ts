// Fjalët kyçe për kërkimin e produkteve.
// Emri "Tub PVC Ø50mm" -> ["tu","tub","pv","pvc","50","50m","50mm"]
// Kështu kërkimi gjen produktin nga çdo fjalë, pa dalluar shkronja të mëdha/të vogla
// dhe pa dalluar ë/e ose ç/c.

const MIN_LEN = 2;
const MAX_PREFIX = 15;

export function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ë -> e, ç -> c
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchWords(text: string): string[] {
  return normalizeText(text).split(" ").filter(w => w.length >= MIN_LEN);
}

// Përdore kur krijon ose editon një produkt: buildSearchKeywords(name, brand)
export function buildSearchKeywords(...fields: (string | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const f of fields) {
    for (const w of searchWords(f || "")) {
      for (let i = MIN_LEN; i <= Math.min(w.length, MAX_PREFIX); i++) {
        set.add(w.slice(0, i));
      }
    }
  }
  return Array.from(set);
}

// Fjala më e gjatë e kërkimit shkon te Firestore, të tjerat filtrohen në faqe
export function pickMainTerm(words: string[]): string | null {
  if (words.length === 0) return null;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  return longest.slice(0, MAX_PREFIX);
}

export function matchesAllWords(text: string, words: string[]): boolean {
  const t = normalizeText(text);
  return words.every(w => t.includes(w));
}
