// Kërkesat e klientit — ruhen në telefonin/kompjuterin e tij (pa llogari),
// që kur të kthehet në NearBuy t'i dalë "E gjete? Mbylle kërkesën".
// Përmban edhe thirrjet te serveri (/api/requests).

import { EXPIRY_DAYS, type RequestKind } from "@/lib/requestRules";

const KEY = "nb_my_requests";

export interface MyRequest {
  kind: RequestKind;
  id: string;
  token: string;
  title: string;       // "Silikon transparent" ose "Hidraulik në Durrës"
  createdAt: number;   // ms
  snoozeUntil?: number;
}

function read(): MyRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as MyRequest[]) : [];
    return Array.isArray(list) ? list.filter(r => r && r.id && r.token) : [];
  } catch { return []; }
}

function write(list: MyRequest[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-10))); } catch { /* shfletues privat */ }
}

export function saveMyRequest(r: Omit<MyRequest, "createdAt">) {
  write([...read().filter(x => x.id !== r.id), { ...r, createdAt: Date.now() }]);
}

// Kërkesat që duhet t'i tregojmë klientit tani
export function pendingMyRequests(): MyRequest[] {
  const now = Date.now();
  const list = read();
  // Pasi kërkesa skadon për bizneset, s'ka pse e pyesim më klientin
  const fresh = list.filter(r => now - r.createdAt < (EXPIRY_DAYS[r.kind] || 7) * 86400000);
  if (fresh.length !== list.length) write(fresh);
  return fresh.filter(r => !r.snoozeUntil || r.snoozeUntil < now);
}

export function snoozeMyRequest(id: string, hours = 24) {
  write(read().map(r => (r.id === id ? { ...r, snoozeUntil: Date.now() + hours * 3600000 } : r)));
}

export function forgetMyRequest(id: string) {
  write(read().filter(r => r.id !== id));
}

// ── Thirrjet te serveri ──────────────────────────────────────────
export async function postRequests(body: Record<string, unknown>, idToken?: string) {
  const res = await fetch("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* bosh */ }
  if (!res.ok || !data.ok) throw new Error(String(data.error || "Diçka shkoi gabim. Provo përsëri pas pak."));
  return data;
}

// Klienti: "E gjeta — mbylle"
export async function closeMyRequest(r: MyRequest) {
  await postRequests({ action: "close", kind: r.kind, id: r.id, token: r.token });
  forgetMyRequest(r.id);
}

// Biznesi/mjeshtri: "E kontaktova" ose "Klienti gjeti zgjidhje"
export async function setLeadStatus(
  kind: RequestKind,
  leadId: string,
  status: "contacted" | "solved",
  user: { getIdToken: () => Promise<string> },
  ownerId?: string,
) {
  const token = await user.getIdToken();
  return postRequests({ action: "status", kind, leadId, status, ownerId }, token) as Promise<{
    ok: boolean; status: string; contactedCount?: number; closedBy?: string;
  }>;
}
