// Çdo mëngjes (Vercel Cron): kujtesa për paketat që skadojnë + përmbledhje për adminin në Telegram.
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { sendTelegram, esc } from "@/lib/server/telegram";
import { sendEmail, emailLayout, ownerEmail, SITE } from "@/lib/server/email";
import { toDate } from "@/lib/subscription";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMES: Record<string, string> = {
  baze: "Bazë", plus: "Plus", premium: "Premium", standard: "Pro", basic: "Bazë", advanced: "Plus", pro: "Premium",
};

export async function GET(req: Request) {
  // Vetëm Vercel Cron (me CRON_SECRET) mund ta thërrasë
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = adminDb();
  const summary: string[] = [];
  let emails = 0;

  for (const kind of ["business", "professional"] as const) {
    const col = kind === "business" ? "businesses" : "professionals";
    const snap = await db.collection(col).where("planStatus", "==", "active").get();
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const end = toDate(d.subscriptionEnd);
      if (!end || !d.subscription || d.subscription === "free") continue;
      const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
      const plan = NAMES[String(d.subscription)] || String(d.subscription);
      const dash = `${SITE}/dashboard/${kind === "business" ? "business" : "professional"}`;
      const endText = end.toLocaleDateString("sq-AL", { day: "numeric", month: "long" });

      if (daysLeft <= 7) summary.push(`${daysLeft < 0 ? "🔴" : "🟡"} ${esc(d.name)} · ${plan} · ${daysLeft < 0 ? "skadoi" : daysLeft === 0 ? "skadon sot" : `${daysLeft} ditë`} · ${esc(d.phone || "")}`);

      // Një email për çdo moment: 7 ditë para, 1 ditë para, dhe kur skadon
      const stage = daysLeft === 7 ? "7" : daysLeft === 1 ? "1" : daysLeft <= 0 && daysLeft >= -2 ? "0" : null;
      if (!stage) continue;
      const key = `${toDate(d.subscriptionEnd)?.toISOString().slice(0, 10)}-${stage}`;
      if (d.expiryNotice === key) continue;
      const to = await ownerEmail(kind, docSnap.id, d);
      const sent = await sendEmail(to,
        stage === "0" ? `⚠️ Paketa ${plan} skadoi` : `⏰ Paketa ${plan} skadon ${stage === "1" ? "nesër" : "për 7 ditë"}`,
        emailLayout(
          stage === "0" ? "Paketa jote skadoi" : "Paketa jote po skadon",
          stage === "0"
            ? `<p>Paketa <b>${plan}</b> për <b>${esc(d.name)}</b> skadoi më ${endText}. ${kind === "business"
                ? "Produktet e tua mbeten në faqe, por nuk renditen më lart dhe ofertat nuk shfaqen."
                : "Nuk merr më kërkesa për punë nga klientët."}</p><p>Rinovoje që të mos humbasësh klientët.</p>`
            : `<p>Paketa <b>${plan}</b> për <b>${esc(d.name)}</b> skadon më <b>${endText}</b>.</p><p>Rinovoje që ${kind === "business" ? "dyqani yt të mbetet lart në kërkim" : "të vazhdosh të marrësh kërkesa për punë"}.</p>`,
          { label: "Rinovo paketën", href: dash }));
      if (sent) { emails++; await docSnap.ref.update({ expiryNotice: key }); }
    }
  }

  if (summary.length > 0) {
    await sendTelegram(`📅 <b>Paketat që skadojnë (7 ditë)</b>\n${summary.join("\n")}\n<a href="${SITE}/admin">Hap panelin</a>`);
  }
  // ── Privatësia: fshijmë emrin dhe numrin e klientëve nga kërkesat e vjetra (60 ditë) ──
  let anonymized = 0;
  try { anonymized = await anonymizeOldRequests(db); }
  catch (e) { console.error("cron anonymize:", e); }

  return NextResponse.json({ ok: true, expiring: summary.length, emails, anonymized });
}

// Kërkesat e reja kanë "retainUntil" (data kur duhen fshirë të dhënat personale).
// Pas fshirjes e heqim këtë fushë, që të mos dalin më në këtë kërkim.
async function anonymizeOldRequests(db: Firestore): Promise<number> {
  const kinds = [
    { col: "customer_requests", parent: "businesses", sub: "leads" },
    { col: "job_requests", parent: "professionals", sub: "jobs" },
  ];
  const now = Timestamp.now();
  let total = 0;
  for (const k of kinds) {
    const snap = await db.collection(k.col).where("retainUntil", "<", now).limit(100).get();
    for (const d of snap.docs) {
      const r = d.data();
      const leadIds = (r.leadIds || {}) as Record<string, string>;
      await Promise.allSettled(Object.entries(leadIds).map(([ownerId, leadId]) =>
        db.collection(k.parent).doc(ownerId).collection(k.sub).doc(leadId).update({ name: "Klient", phone: "" })));
      await d.ref.update({
        name: "Klient", phone: "", phoneNorm: "", ipHash: "",
        anonymizedAt: FieldValue.serverTimestamp(), retainUntil: FieldValue.delete(),
      });
      total++;
    }
  }
  return total;
}
