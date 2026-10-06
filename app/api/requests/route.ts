// Kërkesat e klientëve — gjithçka kalon nga serveri, jo direkt nga faqja te databaza.
//
//  action "create" → klienti dërgon kërkesë për produkt ose punë
//                    (kontrollon numrin, kufijtë kundër spam-it, zgjedh bizneset/mjeshtrit)
//  action "close"  → klienti e mbyll vetë kërkesën ("e gjeta") me kodin sekret që iu dha
//  action "status" → biznesi/mjeshtri shënon "E kontaktova" ose "Klienti gjeti zgjidhje"
//
// Pse në server: klienti s'ka llogari, dhe një biznes s'duhet të shkruajë dot te kërkesat e të tjerëve.

import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { FieldValue, Timestamp, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { adminDb, uidFromRequest } from "@/lib/server/firebaseAdmin";
import { getEffectivePlan } from "@/lib/plans";
import { getEffectiveProPlan, normalizeProfession, PROFESSIONS } from "@/lib/proPlans";
import {
  CITIES, URGENCY, LIMITS, RETENTION_DAYS, EXPIRY_DAYS,
  normalizePhone, formatPhone, PHONE_ERROR, type RequestKind,
} from "@/lib/requestRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TARGETS = 40;
const DELAY_MS = 2 * 60 * 60 * 1000; // Plus/Pro e shohin 2 orë pas Premium
const DAY_MS = 24 * 60 * 60 * 1000;

const COL: Record<RequestKind, string> = { product: "customer_requests", job: "job_requests" };
const PARENT: Record<RequestKind, string> = { product: "businesses", job: "professionals" };
const SUB: Record<RequestKind, string> = { product: "leads", job: "jobs" };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const millis = (t: unknown) => (t as { toMillis?: () => number } | undefined)?.toMillis?.() || 0;

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return (xf ? xf.split(",")[0] : req.headers.get("x-real-ip") || "").trim();
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Kërkesë e pavlefshme."); }
  const kind = body.kind === "job" ? "job" : body.kind === "product" ? "product" : null;
  if (!kind) return fail("Kërkesë e pavlefshme.");

  try {
    if (body.action === "create") return await create(req, kind, body);
    if (body.action === "close") return await closeByCustomer(kind, body);
    if (body.action === "status") return await updateStatus(req, kind, body);
    return fail("Kërkesë e pavlefshme.");
  } catch (e) {
    console.error("api/requests:", e);
    return fail("Diçka shkoi gabim. Provo përsëri pas pak.", 500);
  }
}

// ════════════════════════════════════════════
// 1. KLIENTI DËRGON KËRKESË
// ════════════════════════════════════════════
async function create(req: Request, kind: RequestKind, b: Record<string, unknown>) {
  // Fusha e fshehur — e plotësojnë vetëm robotët. U themi "u dërgua" pa ruajtur asgjë.
  if (str(b.website, 200)) return NextResponse.json({ ok: true, id: "", token: "", sentTo: 0 });

  if (b.consent !== true) return fail("Duhet të pranosh që të kontaktohesh për këtë kërkesë.");
  const name = str(b.name, 80);
  const city = str(b.city, 40);
  const phoneNorm = normalizePhone(str(b.phone, 30));
  if (!name) return fail("Shkruaj emrin.");
  if (!phoneNorm) return fail(PHONE_ERROR);
  if (!CITIES.includes(city)) return fail("Zgjidh qytetin.");

  const db = adminDb();
  const now = Date.now();

  // Të dhënat e kërkesës sipas llojit
  let fields: Record<string, unknown>;
  let sameKey: string; // për të kapur kërkesat e dyfishta
  if (kind === "product") {
    const productId = str(b.productId, 100);
    if (!productId) return fail("Produkti mungon.");
    const p = (await db.collection("products").doc(productId).get()).data();
    if (!p) return fail("Produkti nuk u gjet.");
    fields = { productId, productName: String(p.name || "").slice(0, 200), category: String(p.category || ""), note: str(b.note, 500) };
    sameKey = productId;
  } else {
    const profession = normalizeProfession(str(b.profession, 60));
    const urgency = str(b.urgency, 40);
    const description = str(b.description, 800);
    if (!profession || !PROFESSIONS.includes(profession)) return fail("Zgjidh llojin e mjeshtrit.");
    if (!URGENCY.includes(urgency)) return fail("Zgjidh sa urgjente është puna.");
    if (description.length < 10) return fail("Përshkruaj shkurt punën (të paktën 10 shkronja).");
    fields = { profession, urgency, description };
    sameKey = profession;
  }

  // ── Kufijtë kundër spam-it ───────────────────────────────
  const recent = (await db.collection(COL[kind]).where("phoneNorm", "==", phoneNorm).get())
    .docs.map(d => d.data()).filter(d => now - millis(d.createdAt) < EXPIRY_DAYS[kind] * DAY_MS);
  const dup = recent.find(d => d.status === "open" && (kind === "product" ? d.productId : d.profession) === sameKey);
  if (dup) {
    return fail(kind === "product"
      ? "Ke tashmë një kërkesë të hapur për këtë produkt. Dyqanet do të të kontaktojnë së shpejti."
      : "Ke tashmë një kërkesë të hapur për këtë lloj mjeshtri. Mjeshtrat do të të kontaktojnë së shpejti.", 409);
  }
  if (recent.filter(d => now - millis(d.createdAt) < DAY_MS).length >= LIMITS.perPhonePerDay) {
    return fail("Ke dërguar shumë kërkesa sot nga ky numër. Provo nesër.", 429);
  }
  const ip = clientIp(req);
  const ipHash = ip ? sha(`nearbuy|${ip}`) : "";
  if (ipHash) {
    const [a, c] = await Promise.all([
      db.collection("customer_requests").where("ipHash", "==", ipHash).get(),
      db.collection("job_requests").where("ipHash", "==", ipHash).get(),
    ]);
    const today = [...a.docs, ...c.docs].filter(d => now - millis(d.data().createdAt) < DAY_MS).length;
    if (today >= LIMITS.perDevicePerDay) return fail("Shumë kërkesa nga kjo lidhje interneti sot. Provo nesër.", 429);
  }

  // ── Kush e merr kërkesën ─────────────────────────────────
  type Target = { id: string; premium: boolean };
  let targets: Target[];
  if (kind === "product") {
    const snap = await db.collection("businesses").where("city", "==", city).where("verified", "==", true).get();
    targets = snap.docs.filter(d => {
      const x = d.data();
      const cats: string[] = Array.isArray(x.categories) ? x.categories : x.category ? [x.category] : [];
      return !x.blocked && cats.includes(String(fields.category)) && getEffectivePlan(x).leads;
    }).map(d => ({ id: d.id, premium: getEffectivePlan(d.data()).id === "premium" }));
  } else {
    const snap = await db.collection("professionals").where("verified", "==", true).get();
    targets = snap.docs.filter(d => {
      const x = d.data();
      const zones: string[] = Array.isArray(x.zones) && x.zones.length ? x.zones : [x.city];
      return !x.blocked && normalizeProfession(x.profession) === fields.profession && zones.includes(city) && getEffectiveProPlan(x).jobRequests;
    }).map(d => ({ id: d.id, premium: getEffectiveProPlan(d.data()).id === "premium" }));
  }
  targets = targets.slice(0, MAX_TARGETS);

  // ── Ruajtja ──────────────────────────────────────────────
  const token = randomBytes(18).toString("hex"); // kodi sekret që klienti e mban në telefon për ta mbyllur
  const phone = formatPhone(phoneNorm);
  const batch = db.batch();
  const reqRef = db.collection(COL[kind]).doc();
  const leadIds: Record<string, string> = {};
  for (const t of targets) {
    const leadRef = db.collection(PARENT[kind]).doc(t.id).collection(SUB[kind]).doc();
    leadIds[t.id] = leadRef.id;
    batch.set(leadRef, {
      ...fields, name, phone, city,
      requestId: reqRef.id,
      status: "new",
      contactedCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      visibleAt: Timestamp.fromMillis(t.premium ? now : now + DELAY_MS),
    });
  }
  batch.set(reqRef, {
    ...fields, name, phone, city, phoneNorm,
    status: "open",
    sentTo: targets.length,
    sentToIds: targets.map(t => t.id),
    leadIds,
    contactedBy: [],
    contactedCount: 0,
    closeTokenHash: sha(token),
    ipHash,
    consentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    retainUntil: Timestamp.fromMillis(now + RETENTION_DAYS * DAY_MS),
  });
  await batch.commit();

  return NextResponse.json({ ok: true, id: reqRef.id, token, sentTo: targets.length });
}

// ════════════════════════════════════════════
// Ndihmëse: gjen kopjet e kërkesës te çdo biznes/mjeshtër
// ════════════════════════════════════════════
async function leadRefs(kind: RequestKind, reqId: string, r: DocumentData): Promise<DocumentReference[]> {
  const db = adminDb();
  if (r.leadIds && typeof r.leadIds === "object") {
    return Object.entries(r.leadIds as Record<string, string>)
      .map(([ownerId, leadId]) => db.collection(PARENT[kind]).doc(ownerId).collection(SUB[kind]).doc(leadId));
  }
  // Kërkesat e vjetra (para këtij ndryshimi) nuk kanë leadIds — i kërkojmë një nga një
  const ids: string[] = Array.isArray(r.sentToIds) ? r.sentToIds.slice(0, MAX_TARGETS) : [];
  const snaps = await Promise.all(ids.map(id =>
    db.collection(PARENT[kind]).doc(id).collection(SUB[kind]).where("requestId", "==", reqId).get()));
  return snaps.flatMap(s => s.docs.map(d => d.ref));
}

async function updateAll(refs: DocumentReference[], data: Record<string, unknown>) {
  await Promise.allSettled(refs.map(ref => ref.update(data)));
}

async function closeRequest(kind: RequestKind, reqRef: DocumentReference, r: DocumentData, closedBy: string) {
  await reqRef.update({ status: "closed", closedBy, closedAt: FieldValue.serverTimestamp() });
  await updateAll(await leadRefs(kind, reqRef.id, r), { status: "closed", closedBy });
}

// ════════════════════════════════════════════
// 2. KLIENTI E MBYLL VETË ("e gjeta")
// ════════════════════════════════════════════
async function closeByCustomer(kind: RequestKind, b: Record<string, unknown>) {
  const id = str(b.id, 100);
  const token = str(b.token, 100);
  if (!id || token.length < 20) return fail("Kërkesë e pavlefshme.");
  const reqRef = adminDb().collection(COL[kind]).doc(id);
  const r = (await reqRef.get()).data();
  if (!r) return NextResponse.json({ ok: true, closed: true }); // s'ekziston më — për klientin është njësoj
  if (!r.closeTokenHash || sha(token) !== r.closeTokenHash) return fail("Nuk lejohet.", 403);
  if (r.status !== "closed") await closeRequest(kind, reqRef, r, "customer");
  return NextResponse.json({ ok: true, closed: true });
}

// ════════════════════════════════════════════
// 3. BIZNESI / MJESHTRI: "E kontaktova" ose "Klienti gjeti zgjidhje"
// ════════════════════════════════════════════
async function updateStatus(req: Request, kind: RequestKind, b: Record<string, unknown>) {
  const uid = await uidFromRequest(req);
  if (!uid) return fail("Hyr përsëri në llogari.", 401);
  const status = b.status === "contacted" || b.status === "solved" ? b.status : null;
  const leadId = str(b.leadId, 100);
  if (!status || !leadId) return fail("Kërkesë e pavlefshme.");

  const db = adminDb();
  // Kush je: mjeshtrat kanë ID = uid; bizneset mund të kenë ID tjetër (ownerUID)
  const ownerId = kind === "job" ? uid : str(b.ownerId, 100) || uid;
  const owner = (await db.collection(PARENT[kind]).doc(ownerId).get()).data();
  if (!owner) return fail("Profili nuk u gjet.", 404);
  if (kind === "product" && ownerId !== uid && owner.ownerUID !== uid && owner.uid !== uid) return fail("Nuk lejohet.", 403);
  const allowed = kind === "product" ? getEffectivePlan(owner).leads : getEffectiveProPlan(owner).jobRequests;
  if (!allowed) return fail("Paketa jote nuk i përfshin kërkesat e klientëve.", 403);

  const leadRef = db.collection(PARENT[kind]).doc(ownerId).collection(SUB[kind]).doc(leadId);
  const lead = (await leadRef.get()).data();
  if (!lead) return fail("Kërkesa nuk u gjet.", 404);
  if (millis(lead.visibleAt) > Date.now()) return fail("Kërkesa nuk është ende e dukshme për ty.", 403);

  const reqRef = db.collection(COL[kind]).doc(String(lead.requestId));
  const r = (await reqRef.get()).data();
  if (!r) {
    if (status === "contacted" && lead.status === "new") await leadRef.update({ status: "contacted" });
    return NextResponse.json({ ok: true, status: status === "solved" ? lead.status : "contacted" });
  }
  if (r.status === "closed") {
    if (lead.status !== "closed") await leadRef.update({ status: "closed", closedBy: r.closedBy || "customer" });
    return NextResponse.json({ ok: true, status: "closed", closedBy: r.closedBy || "customer" });
  }

  if (status === "solved") {
    await closeRequest(kind, reqRef, r, ownerId);
    return NextResponse.json({ ok: true, status: "closed", closedBy: ownerId });
  }

  // "E kontaktova" — numërojmë sa biznese të ndryshme e kanë kontaktuar klientin
  if (lead.status === "new") await leadRef.update({ status: "contacted" });
  const already: string[] = Array.isArray(r.contactedBy) ? r.contactedBy : [];
  let count = already.length;
  if (!already.includes(ownerId)) {
    await reqRef.update({ contactedBy: FieldValue.arrayUnion(ownerId) });
    const fresh = (await reqRef.get()).data();
    count = Array.isArray(fresh?.contactedBy) ? fresh!.contactedBy.length : count + 1;
    await reqRef.update({ contactedCount: count });
    await updateAll(await leadRefs(kind, reqRef.id, r), { contactedCount: count });
  }
  return NextResponse.json({ ok: true, status: "contacted", contactedCount: count });
}
