// Krahason rreshtat nga Excel-i i biznesit me katalogun e NearBuy.
// Rezultati për çdo rresht: "sure" (u gjet), "maybe" (ndoshta — biznesi zgjedh), "new" (nuk e kemi).
//
// Rregulli më i rëndësishëm: NUMRAT. "Celes 13 mm" nuk lidhet kurrë me "Celes 14 mm".
// Çdo numër që ka shkruar biznesi duhet të gjendet edhe te produkti ynë.

export interface MatchCatalogItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
}

export interface MatchCandidate {
  id: string;
  score: number;
}

export interface MatchResult {
  status: "sure" | "maybe" | "new";
  candidates: MatchCandidate[]; // të renditur nga më i miri
}

function baseNormalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d),(\d)/g, "$1.$2")       // 3,2 -> 3.2
    .replace(/(\d)\s*[″"]/g, "$1 ")       // 1/2" -> 1/2
    .replace(/(\d)([a-z])/g, "$1 $2")      // 32mm -> 32 mm
    .replace(/([a-z])(\d)/g, "$1 $2");     // m10 -> m 10
}

// Fjalë që nuk ndihmojnë për të dalluar produktet
const STOP = new Set(["me", "per", "dhe", "te", "ne", "nga", "i", "e", "se", "pa", "mm", "cm", "m", "cope", "cp", "pcs", "set", "copa"]);

// Numrat ruhen bashkë me njësinë kur ka: "10 W" -> "10|w", "32 mm" -> "32|mm", "13" -> "13|"
const NUM_RE = /(\d+(?:\.\d+)?(?:\/\d+)?)(?:\s?(mm2|mm|cm|kw|kg|ml|ah|nm|bar|hp|cc|w|v|m|l)\b)?/g;
export function extractNumbers(text: string): string[] {
  const t = baseNormalize(text);
  const out: string[] = [];
  for (const m of Array.from(t.matchAll(NUM_RE))) out.push(`${m[1].replace(/\.0+$/, "")}|${m[2] || ""}`);
  return out;
}

// "10|w" përputhet me "10|w" ose "10|" (njësia mungon te njëri). "10|w" NUK përputhet me "10|v".
function numbersMatch(q: string, c: string): boolean {
  const [qn, qu] = q.split("|"), [cn, cu] = c.split("|");
  return qn === cn && (!qu || !cu || qu === cu);
}

export function extractWords(text: string): string[] {
  const t = baseNormalize(text).replace(/[^a-z0-9.\/]+/g, " ");
  return t.split(" ").filter(w => w.length >= 2 && !/\d/.test(w) && !STOP.has(w));
}

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // Prapashtesat shqipe: "celes" ~ "celesa", "tub" ~ "tubi"
  const min = Math.min(a.length, b.length);
  if (min < 3) return false;
  return a.startsWith(b) || b.startsWith(a) || (min >= 5 && a.slice(0, 5) === b.slice(0, 5));
}

interface Indexed {
  item: MatchCatalogItem;
  words: string[];
  numbers: string[];
}

export class ProductMatcher {
  private items: Indexed[] = [];
  private byKey = new Map<string, number[]>();
  private byBarcode = new Map<string, number>();

  constructor(catalog: MatchCatalogItem[]) {
    catalog.forEach((item, i) => {
      const text = `${item.name} ${item.brand || ""}`;
      const words = extractWords(text);
      this.items.push({ item, words, numbers: extractNumbers(item.name) });
      for (const w of Array.from(new Set(words.map(w => w.slice(0, 3))))) {
        const arr = this.byKey.get(w) || [];
        arr.push(i);
        this.byKey.set(w, arr);
      }
      const bc = (item.barcode || "").replace(/\s/g, "");
      if (bc.length >= 8) this.byBarcode.set(bc, i);
    });
  }

  match(name: string, barcode?: string, brand?: string): MatchResult {
    // 1. Barkodi — gjithmonë i saktë
    const bc = (barcode || "").replace(/\s/g, "");
    if (bc.length >= 8 && this.byBarcode.has(bc)) {
      return { status: "sure", candidates: [{ id: this.items[this.byBarcode.get(bc)!].item.id, score: 1 }] };
    }

    const qWords = extractWords(`${name} ${brand || ""}`);
    const qNums = extractNumbers(name);
    if (qWords.length === 0) return { status: "new", candidates: [] };

    // 2. Kandidatët: produktet që ndajnë të paktën një fjalë
    const seen = new Set<number>();
    for (const w of qWords) for (const i of this.byKey.get(w.slice(0, 3)) || []) seen.add(i);

    const scored: MatchCandidate[] = [];
    for (const i of Array.from(seen)) {
      const c = this.items[i];
      // Çdo numër i biznesit duhet të jetë te produkti ynë
      const pool = [...c.numbers];
      let numbersOk = true;
      for (const n of qNums) {
        const unit = n.split("|")[1];
        // Nëse produkti ynë ka një vlerë me të njëjtën njësi (p.sh. 9 W), ajo duhet të jetë e njëjta
        const sameUnit = unit ? c.numbers.filter(c2 => c2.split("|")[1] === unit) : [];
        const k = sameUnit.length
          ? pool.findIndex(c2 => c2 === n)
          : pool.findIndex(c2 => numbersMatch(n, c2));
        if (k === -1) { numbersOk = false; break; }
        pool.splice(k, 1);
      }
      if (!numbersOk) continue;

      const hitQ = qWords.filter(q => c.words.some(w => wordsMatch(q, w))).length;
      const hitC = c.words.filter(w => qWords.some(q => wordsMatch(q, w))).length;
      const coverQ = hitQ / qWords.length;                 // sa nga fjalët e biznesit gjenden
      const coverC = c.words.length ? hitC / c.words.length : 0; // sa nga fjalët tona gjenden
      // Numrat tanë që biznesi nuk i ka përmendur e ulin pak pikën (p.sh. masa të ndryshme)
      const extraNums = pool.filter(n => n.split("|")[0].length <= 3).length;
      const score = coverQ * 0.65 + coverC * 0.35 - extraNums * 0.08;
      if (coverQ >= 0.5) scored.push({ id: c.item.id, score: Math.max(0, Math.min(1, score)) });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3);
    if (top.length === 0) return { status: "new", candidates: [] };

    const best = top[0].score;
    const second = top[1]?.score ?? 0;
    if (best >= 0.8 && best - second >= 0.12) return { status: "sure", candidates: top };
    if (best >= 0.5) return { status: "maybe", candidates: top };
    return { status: "new", candidates: top };
  }
}

// ── Leximi i vlerave nga Excel ───────────────────────────────────────────────

export function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return value > 0 ? Math.round(value * 100) / 100 : null;
  let s = String(value ?? "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  if (lastDot > -1 && lastComma > -1) {
    // 1.250,50 ose 1,250.50 — ndarësi i fundit është presja dhjetore
    const dec = lastDot > lastComma ? "." : ",";
    const thou = dec === "." ? "," : ".";
    s = s.split(thou).join("").replace(dec, ".");
  } else if (lastComma > -1) {
    // 1,250 (mijëshe) ose 12,5 (dhjetore)
    s = /,\d{3}$/.test(s) && s.split(",").length >= 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1 && /\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, ""); // 1.250 -> 1250
  }
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function parseStock(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "number") return value > 0;
  const s = String(value).trim().toLowerCase();
  if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(",", ".")) > 0;
  return !/^(jo|no|0|ska|s'ka|s ka|mbaruar|false|x)$/.test(s);
}
